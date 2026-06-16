import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PaginationDto } from '@/common/dtos/paginationDto.dto';
import { InfiniteDataResponseType } from '@/common/types/infiniteDataResponse.type';
import {
  Conversation,
  ConversationStatus,
  Message,
  MessageKind,
  MessageRole,
} from '@/generated/prisma/client';
import { RecommendationsService } from '@/recommendations/recommendations.service';
import { IAgentService } from './agent/agent.service.interface';
import { IConversationsRepository } from './repository/conversations.repository.interface';
import {
  AgentInitPayload,
  AgentMessageHandler,
  AgentMessageOption,
  AgentMessagePayload,
  AgentQuestionContent,
  AgentResultContent,
  ConversationWithMessages,
  HistoryEntry,
  SendUserMessageParams,
  StartChatParams,
  UserMessageContent,
} from './types';

export type { AgentMessageHandler } from './types';

/**
 * Бизнес логика чата.
 * - persist в БД
 * - управление сессиями к внешнему сервису (мок)
 * - построение init-payload по истории
 */
@Injectable()
export class ConversationsService implements OnModuleDestroy {
  private readonly logger = new Logger(ConversationsService.name);

  /** активные сессии агента: conversationId -> IAgentService */
  private readonly activeSessions = new Map<string, IAgentService>();

  constructor(
    @Inject(IConversationsRepository)
    private readonly repository: IConversationsRepository,
    @Inject(IAgentService)
    private readonly agent: IAgentService,
    private readonly recommendationsService: RecommendationsService
  ) {}

  async findAll(
    queryParams: PaginationDto
  ): Promise<InfiniteDataResponseType<Conversation>> {
    this.logger.debug('Fetching all conversations');

    return this.repository.findAll(queryParams);
  }

  async findByIdWithMessages(id: string): Promise<ConversationWithMessages> {
    const conversation = await this.repository.findByIdWithMessages(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation "${id}" was not found`);
    }
    return conversation;
  }

  async findById(id: string): Promise<Conversation> {
    const conversation = await this.repository.findById(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation "${id}" was not found`);
    }
    return conversation;
  }

  /**
   * Создаёт или восстанавливает чат, открывает сессию к моку и шлёт init.
   * Возвращает conversationId.
   * agent_message приходят асинхронно через onAgent.
   */
  async startChat(params: StartChatParams): Promise<string> {
    let conversation: Conversation | null = null;

    if (params.conversationId) {
      conversation = await this.repository.findById(params.conversationId);
      if (!conversation) {
        throw new NotFoundException(
          `Conversation "${params.conversationId}" was not found`
        );
      }
    } else {
      conversation = await this.repository.createConversation(params.userId);
    }

    const conversationId = conversation.id;

    this.openSession(conversationId, params.onAgent);

    const history = await this.buildHistory(conversationId);

    const initPayload: AgentInitPayload = {
      type: 'init',
      intent: conversation.intent,
      history,
    };

    this.agent.send(conversationId, initPayload);

    return conversationId;
  }

  /**
   * Обрабатывает входящее сообщение юзера.
   * - валидирует существование чата и активной сессии
   * - сохраняет сообщение в БД
   */
  async sendUserMessage(params: SendUserMessageParams): Promise<void> {
    const conversation = await this.repository.findById(params.conversationId);
    if (!conversation) {
      throw new NotFoundException(
        `Conversation "${params.conversationId}" was not found`
      );
    }

    if (
      conversation.status !== ConversationStatus.active &&
      conversation.status !== ConversationStatus.awaiting_choice
    ) {
      throw new NotFoundException(
        `Conversation "${params.conversationId}" is not active`
      );
    }

    // Если по какой-то причине нет открытой сессии (рестарт сервера) —
    // поднимаем её и проигрываем init по истории прежде чем слать сообщение.
    if (!this.activeSessions.has(params.conversationId)) {
      this.openSession(params.conversationId, params.onAgent);

      const history = await this.buildHistory(params.conversationId);
      this.agent.send(params.conversationId, {
        type: 'init',
        intent: conversation.intent,
        history,
      });
    }

    let content: UserMessageContent;
    let persistedKind: MessageKind;
    let persistedContent: string;
    let persistedOptionId: string | null = null;

    switch (params.kind) {
      case MessageKind.option: {
        content = {
          kind: MessageKind.option,
          id: params.value,
          label: params.label ?? params.value,
        };
        persistedKind = MessageKind.option;
        persistedContent = content.label;
        persistedOptionId = params.value;
        break;
      }
      case MessageKind.recommendation_selected: {
        content = {
          kind: MessageKind.recommendation_selected,
          benchmarkId: params.value,
        };
        persistedKind = MessageKind.recommendation_selected;
        persistedContent = params.value;
        break;
      }
      case MessageKind.recommendation_rejected: {
        content = {
          kind: MessageKind.recommendation_rejected,
          benchmarkId: params.value,
        };
        persistedKind = MessageKind.recommendation_rejected;
        persistedContent = params.value;
        break;
      }
      case MessageKind.text:
      default: {
        content = { kind: MessageKind.text, label: params.value };
        persistedKind = MessageKind.text;
        persistedContent = params.value;
        break;
      }
    }

    await this.repository.createMessage({
      conversationId: params.conversationId,
      role: MessageRole.user,
      kind: persistedKind,
      content: persistedContent,
      optionId: persistedOptionId,
      options: null,
    });

    this.agent.send(params.conversationId, {
      type: 'message',
      content,
    });
  }

  /** Корректно закрыть сессию (по disconnect или isFinal). */
  closeSession(conversationId: string): void {
    if (!this.activeSessions.has(conversationId)) return;
    this.agent.close(conversationId);
    this.activeSessions.delete(conversationId);
    this.logger.log(`Session closed: conversationId="${conversationId}"`);
  }

  async onModuleDestroy(): Promise<void> {
    for (const conversationId of Array.from(this.activeSessions.keys())) {
      this.closeSession(conversationId);
    }
  }

  // ----------------------------------------------------------------------
  //  internals
  // ----------------------------------------------------------------------

  private openSession(
    conversationId: string,
    onAgent: AgentMessageHandler
  ): void {
    const subscribe = (payload: AgentMessagePayload): void => {
      void this.handleAgentMessage(conversationId, payload, onAgent);
    };

    if (this.activeSessions.has(conversationId)) {
      // переподписка нового сокета на ту же сессию
      this.agent.onMessage(conversationId, subscribe);
      return;
    }

    this.agent.connect(conversationId);
    this.agent.onMessage(conversationId, subscribe);
    this.activeSessions.set(conversationId, this.agent);
  }

  private async handleAgentMessage(
    conversationId: string,
    payload: AgentMessagePayload,
    onAgent: AgentMessageHandler
  ): Promise<void> {
    try {
      this.assertAgentPayload(payload);

      // persist сообщение агента
      if ('question' === payload.content.kind) {
        await this.repository.createMessage({
          conversationId,
          role: MessageRole.agent,
          kind: MessageKind.question,
          content: payload.content.label,
          optionId: null,
          options: payload.content.options
            ? (payload.content.options)
            : null,
        });
      } else {
        // result — рекомендация от агента
        await this.repository.createMessage({
          conversationId,
          role: MessageRole.agent,
          kind: MessageKind.result,
          content: payload.content.label,
          optionId: null,
          options: {
            benchmarkId: payload.content.benchmarkId,
            status: payload.content.status,
          },
        });

        await this.recommendationsService.createMany({
          conversationId,
          benchmarkIds: [payload.content.benchmarkId],
        });

        // переводим чат в ожидание выбора пользователя.
        // сессию НЕ закрываем — юзер ещё должен выбрать/отклонить.
        await this.repository.updateStatus(
          conversationId,
          ConversationStatus.awaiting_choice
        );
      }

      // отдать на фронт
      onAgent(payload);

      // финал — только для НЕ-result сообщений
      // (приходит уже после того, как юзер выбрал/отклонил рекомендацию)
      if (payload.isFinal && 'result' !== payload.type) {
        await this.repository.updateStatus(
          conversationId,
          ConversationStatus.completed
        );
        this.closeSession(conversationId);
      }
    } catch (error) {
      const message = (error as Error).message ?? 'Internal error';
      this.logger.error(
        `Failed to process agent message for conversationId="${conversationId}": ${message}`
      );
      // даём фронту знать про ошибку
      onAgent({
        type: 'error',
        isFinal: true,
        content: { message },
      });
    }
  }

  private assertAgentPayload(
    payload: AgentMessagePayload
  ): asserts payload is Extract<
    AgentMessagePayload,
    { type: 'question' | 'result' }
  > {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid agent payload: not an object');
    }
    if (payload.type !== 'question' && payload.type !== 'result') {
      throw new Error(`Invalid agent payload: unknown type "${String((payload as { type?: unknown }).type)}"`);
    }
    if (!payload.content || typeof payload.content !== 'object') {
      throw new Error('Invalid agent payload: missing content');
    }
  }

  /** Сборка истории для init на основе сохранённых сообщений. */
  private async buildHistory(conversationId: string): Promise<HistoryEntry[]> {
    const conversation = await this.repository.findByIdWithMessages(
      conversationId
    );
    if (!conversation) return [];

    return conversation.messages.map((m: Message) => this.toHistoryEntry(m));
  }

  private toHistoryEntry(m: Message): HistoryEntry {
    if (m.role === MessageRole.agent && m.kind === MessageKind.result) {
      const opts = (m.options ?? {}) as {
        benchmarkId?: string;
        status?: AgentResultContent['status'];
      };

      if (!opts.benchmarkId || !opts.status) {
        this.logger.warn(
          `Corrupted result message options: messageId="${m.id}" conversationId="${m.conversationId}" options=${JSON.stringify(m.options)}`
        );
      }

      return {
        role: MessageRole.agent,
        content: {
          kind: MessageKind.result,
          label: m.content,
          benchmarkId: opts.benchmarkId ?? '',
          status: opts.status ?? 'done',
        },
      };
    }

    if (m.role === MessageRole.agent) {
      const options =
        Array.isArray(m.options) && m.options.length > 0
          ? (m.options as unknown as AgentMessageOption[])
          : null;

      const content: AgentQuestionContent = {
        kind: MessageKind.question,
        label: m.content,
        ...(options ? { options } : {}),
      };

      return { role: MessageRole.agent, content };
    }

    if (m.kind === MessageKind.option && m.optionId) {
      return {
        role: MessageRole.user,
        content: { kind: MessageKind.option, id: m.optionId, label: m.content },
      };
    }

    if (m.kind === MessageKind.recommendation_selected) {
      return {
        role: MessageRole.user,
        content: {
          kind: MessageKind.recommendation_selected,
          benchmarkId: m.content,
        },
      };
    }

    if (m.kind === MessageKind.recommendation_rejected) {
      return {
        role: MessageRole.user,
        content: {
          kind: MessageKind.recommendation_rejected,
          benchmarkId: m.content,
        },
      };
    }

    return {
      role: MessageRole.user,
      content: { kind: MessageKind.text, label: m.content },
    };
  }
}
