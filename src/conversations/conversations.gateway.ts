import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { Public } from '@/common/decorators/public.decorator';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/sendMessage.dto';
import { StartChatDto } from './dto/startChat.dto';
import { AgentMessagePayload } from './types';

const DEFAULT_USER_ID = 'test-user';

@Public()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ConversationsGateway
implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ConversationsGateway.name);

  /** conversationId -> socketId — чтобы корректно гасить сессию на disconnect */
  private readonly socketByConversation = new Map<string, string>();
  /** socketId -> conversationId */
  private readonly conversationBySocket = new Map<string, string>();

  @WebSocketServer()
  server!: Server;

  constructor(private readonly service: ConversationsService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const conversationId = this.conversationBySocket.get(client.id);
    this.logger.log(
      `Client disconnected: ${client.id}, conversationId="${conversationId ?? 'n/a'}"`
    );

    if (!conversationId) return;
    this.conversationBySocket.delete(client.id);
    this.socketByConversation.delete(conversationId);
    this.service.closeSession(conversationId);
  }

  @SubscribeMessage('start_chat')
  async onStartChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: StartChatDto
  ): Promise<void> {
    try {
      const conversationId = await this.service.startChat({
        conversationId: body?.conversationId,
        userId: DEFAULT_USER_ID,
        onAgent: (payload) => this.pushAgentMessage(client, payload),
      });

      this.bindSocket(client, conversationId);

      client.emit('chat_started', { conversationId });
    } catch (error) {
      this.handleError(client, error, 'Failed to start chat');
    }
  }

  @SubscribeMessage('send_message')
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

  private bindSocket(client: Socket, conversationId: string): void {
    const previous = this.socketByConversation.get(conversationId);
    if (previous && previous !== client.id) {
      this.conversationBySocket.delete(previous);
    }
    this.socketByConversation.set(conversationId, client.id);
    this.conversationBySocket.set(client.id, conversationId);
  }

  private pushAgentMessage(
    client: Socket,
    payload: AgentMessagePayload
  ): void {
    client.emit('agent_message', payload);
  }

  private handleError(client: Socket, error: unknown, fallback: string): void {
    const message =
      error instanceof Error && error.message ? error.message : fallback;
    this.logger.error(`${fallback}: ${message}`);
    client.emit('error', { message });
  }
}
