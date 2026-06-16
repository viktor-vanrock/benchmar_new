import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtAuthGuard } from '@/auth/jwt/ws-jwt-auth.guard';
import { WsCurrentUser } from '@/common/decorators/wsCurrentUser.decorator';
import { WsEvent } from '@/common/enums/wsEvents.enum';
import { ConversationStatus, RecommendationStatus } from '@/generated/prisma/enums';
import { RecommendationActionDto } from '@/recommendations/dto/recommendationAction.dto';
import { RecommendationsService } from '@/recommendations/recommendations.service';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/sendMessage.dto';
import { StartChatDto } from './dto/startChat.dto';
import { AgentMessagePayload } from './types';
import type { RequestUser } from '@/common/types/request.type';

@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ConversationsGateway
implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ConversationsGateway.name);

  private readonly socketByConversation = new Map<string, string>();
  private readonly conversationBySocket = new Map<string, string>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly service: ConversationsService,
    private readonly recommendationsService: RecommendationsService
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const conversationId = this.conversationBySocket.get(client.id);
    this.logger.log(
      `Client disconnected: ${client.id}, conversationId="${conversationId ?? 'n/a'}"`
    );

    if (!conversationId) return;
    this.service.closeSession(conversationId);
    this.cleanupSocket(conversationId);
  }

  @SubscribeMessage(WsEvent.StartChat)
  async onStartChat(
    @ConnectedSocket() client: Socket,
    @WsCurrentUser() user: RequestUser,
    @MessageBody() body: StartChatDto
  ): Promise<void> {
    try {
      const conversationId = await this.service.startChat({
        conversationId: body?.conversationId,
        userId: user.id,
        onAgent: (payload) => this.pushAgentMessage(client, payload),
      });

      this.bindSocket(client, conversationId);

      client.emit(WsEvent.ChatStarted, { conversationId });
    } catch (error) {
      this.handleError(client, error, 'Failed to start chat');
    }
  }

  @SubscribeMessage(WsEvent.SendMessage)
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendMessageDto
  ): Promise<void> {
    try {
      this.bindSocket(client, body.conversationId);

      await this.service.sendUserMessage({
        conversationId: body.conversationId,
        kind: body.kind,
        value: body.value,
        label: body.label,
        onAgent: (payload) => this.pushAgentMessage(client, payload),
      });
    } catch (error) {
      this.handleError(client, error, 'Failed to send message');
    }
  }

  @SubscribeMessage(WsEvent.SelectRecommendation)
  async onSelectRecommendation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RecommendationActionDto
  ): Promise<void> {
    try {
      this.logger.log(
        `Selecting recommendation: id="${body.recommendationId}" clientId="${client.id}"`
      );

      // 1) читаем рекомендацию (без записи) — нужны conversationId/benchmarkId
      const recommendation = await this.recommendationsService.findById(
        body.recommendationId
      );

      // 2) отправляем агенту ПЕРВЫМ — если упадёт, в БД ничего не меняем
      //    и socket-binding не трогаем (никаких побочных эффектов на провале)
      await this.service.sendUserMessage({
        conversationId: recommendation.conversationId,
        kind: 'recommendation_selected',
        value: recommendation.benchmarkId,
        onAgent: (payload) => this.pushAgentMessage(client, payload),
      });

      // 3) агент принял — только теперь безопасно перепривязать сокет
      this.bindSocket(client, recommendation.conversationId);

      // 4) сохраняем статус
      const updated = await this.recommendationsService.updateStatus({
        id: body.recommendationId,
        status: RecommendationStatus.selected,
      });

      // 5) уведомляем фронт
      client.emit(WsEvent.RecommendationUpdated, updated);

      // 6) если агент уже закрыл чат (isFinal на ack) — чистим карты сокетов
      const conversation = await this.service.findById(
        recommendation.conversationId
      );
      if (conversation.status === ConversationStatus.completed) {
        this.cleanupSocket(recommendation.conversationId);
      }
    } catch (error) {
      this.handleError(client, error, 'Failed to select recommendation');
    }
  }

  @SubscribeMessage(WsEvent.RejectRecommendation)
  async onRejectRecommendation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RecommendationActionDto
  ): Promise<void> {
    try {
      this.logger.log(
        `Rejecting recommendation: id="${body.recommendationId}" clientId="${client.id}"`
      );

      // 1) читаем рекомендацию (без записи) — нужны conversationId/benchmarkId
      const recommendation = await this.recommendationsService.findById(
        body.recommendationId
      );

      // 2) отправляем агенту ПЕРВЫМ — если упадёт, в БД ничего не меняем
      //    и socket-binding не трогаем (никаких побочных эффектов на провале)
      await this.service.sendUserMessage({
        conversationId: recommendation.conversationId,
        kind: 'recommendation_rejected',
        value: recommendation.benchmarkId,
        onAgent: (payload) => this.pushAgentMessage(client, payload),
      });

      // 3) агент принял — только теперь безопасно перепривязать сокет
      this.bindSocket(client, recommendation.conversationId);

      // 4) сохраняем статус
      const updated = await this.recommendationsService.updateStatus({
        id: body.recommendationId,
        status: RecommendationStatus.rejected,
      });

      // 5) уведомляем фронт
      client.emit(WsEvent.RecommendationUpdated, updated);

      // 6) если агент уже закрыл чат (isFinal на ack) — чистим карты сокетов
      const conversation = await this.service.findById(
        recommendation.conversationId
      );
      if (conversation.status === ConversationStatus.completed) {
        this.cleanupSocket(recommendation.conversationId);
      }
    } catch (error) {
      this.handleError(client, error, 'Failed to reject recommendation');
    }
  }

  private bindSocket(client: Socket, conversationId: string): void {
    const previous = this.socketByConversation.get(conversationId);
    if (previous && previous !== client.id) {
      this.conversationBySocket.delete(previous);
    }
    this.socketByConversation.set(conversationId, client.id);
    this.conversationBySocket.set(client.id, conversationId);
  }

  private cleanupSocket(conversationId: string): void {
    const socketId = this.socketByConversation.get(conversationId);
    if (socketId) {
      this.conversationBySocket.delete(socketId);
    }
    this.socketByConversation.delete(conversationId);
  }

  private pushAgentMessage(
    client: Socket,
    payload: AgentMessagePayload
  ): void {
    client.emit(WsEvent.AgentMessage, payload);
  }

  private handleError(client: Socket, error: unknown, fallback: string): void {
    const message =
      error instanceof Error && error.message ? error.message : fallback;
    this.logger.error(`${fallback}: ${message}`);
    client.emit(WsEvent.Error, { message });
  }
}
