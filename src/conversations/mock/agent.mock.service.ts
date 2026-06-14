import { EventEmitter } from 'events';
import { Injectable, Logger } from '@nestjs/common';
import { IAgentService } from '../agent/agent.service.interface';
import { SessionState as SessionStateAgentWsService } from '../agent/agent.ws.service';
import {
  AgentMessagePayload,
  AgentOutgoingPayload,
  HistoryEntry,
} from '../types';

const SessionStep = {
  AwaitInit: 'await_init',
  AwaitInitialText: 'await_initial_text',
  AwaitYesNo: 'await_yes_no',
  AwaitDomain: 'await_domain',
  AwaitDifficulty: 'await_difficulty',
  AwaitDatasetSize: 'await_dataset_size',
  Closed: 'closed',
} as const;

type SessionState = Pick<SessionStateAgentWsService, 'emitter'> & {
  step: typeof SessionStep[keyof typeof SessionStep];
};

/**
 * Мок внешнего WS-сервиса.
 * Интерфейс приближен к нативному `ws` (connect / send / onMessage / close),
 * чтобы в проде заменить одной строкой на:
 *   const ws = new WebSocket(process.env.THIRD_PARTY_WS_URL, { headers: {...} })
 */
@Injectable()
export class AgentMockService implements IAgentService {
  private readonly logger = new Logger(AgentMockService.name);
  private readonly sessions = new Map<string, SessionState>();

  connect(conversationId: string): void {
    if (this.sessions.has(conversationId)) {
      this.logger.warn(
        `Mock session already exists for conversationId="${conversationId}"`
      );
      return;
    }

    this.sessions.set(conversationId, {
      emitter: new EventEmitter(),
      step: SessionStep.AwaitInit,
    });

    this.logger.log(`Mock connected: conversationId="${conversationId}"`);
  }

  onMessage(
    conversationId: string,
    callback: (data: AgentMessagePayload) => void
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) {
      this.logger.warn(
        `Cannot subscribe — no mock session for conversationId="${conversationId}"`
      );
      return;
    }
    session.emitter.on('message', callback);
  }

  send(conversationId: string, data: AgentOutgoingPayload): void {
    const session = this.sessions.get(conversationId);
    if (!session || SessionStep.Closed === session.step) {
      this.logger.warn(
        `Cannot send — no active mock session for conversationId="${conversationId}"`
      );
      return;
    }
    setImmediate(() => this.handle(conversationId, data));
  }

  close(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    session.emitter.removeAllListeners();
    session.step = SessionStep.Closed;
    this.sessions.delete(conversationId);

    this.logger.log(`Mock closed: conversationId="${conversationId}"`);
  }

  private handle(conversationId: string, data: AgentOutgoingPayload): void {
    const session = this.sessions.get(conversationId);
    if (!session || SessionStep.Closed === session.step) return;

    try {
      if ('init' === data.type) {
        this.handleInit(conversationId, data.history, session);
        return;
      }

      if ('message' === data.type) {
        this.handleClientMessage(conversationId, data, session);
        return;
      }
    } catch (error) {
      this.logger.error(
        `Mock handler failure for conversationId="${conversationId}": ${(error as Error).message}`
      );
    }
  }

  private handleInit(
    conversationId: string,
    history: HistoryEntry[],
    session: SessionState
  ): void {
    const userAnswers = history.filter((h) => 'user' === h.role);
    const answerCount = userAnswers.length;

    switch (answerCount) {
      case 0:
        session.step = SessionStep.AwaitInitialText;
        this.emit(conversationId, this.initialQuestion());
        break;

      case 1:
        session.step = SessionStep.AwaitYesNo;
        this.emit(conversationId, this.yesNoQuestion());
        break;

      case 2: {
      // Блок для проверки yesNo
        const yesNo = userAnswers[1];
        const acceptedFirst =
          'option' === yesNo.content.kind && '1' === yesNo.content.id;

        if (acceptedFirst) {
          session.step = SessionStep.Closed;
          this.emit(conversationId, this.finalAccepted());
          break;
        }

        // Если не acceptedFirst, переходим к следующему вопросу
        session.step = SessionStep.AwaitDomain;
        this.emit(conversationId, this.domainQuestion());
        break;
      }

      case 3:
        session.step = SessionStep.AwaitDifficulty;
        this.emit(conversationId, this.difficultyQuestion());
        break;

      case 4:
        session.step = SessionStep.AwaitDatasetSize;
        this.emit(conversationId, this.datasetSizeQuestion());
        break;

      default:
      // 5+ ответов или необработанный случай
        session.step = SessionStep.Closed;
        this.emit(conversationId, this.finalNarrowed());
        break;
    }
  }

  private handleClientMessage(
    conversationId: string,
    data: { content: { kind: 'text' | 'option'; id?: string; label: string } },
    session: SessionState
  ): void {
    switch (session.step) {
      case SessionStep.AwaitInitialText:
        session.step = SessionStep.AwaitYesNo;
        this.emit(conversationId, this.yesNoQuestion());
        return;

      case SessionStep.AwaitYesNo: {
        const acceptedFirst =
          'option' === data.content.kind && '1' === data.content.id;
        if (acceptedFirst) {
          session.step = SessionStep.Closed;
          this.emit(conversationId, this.finalAccepted());
        } else {
          session.step = SessionStep.AwaitDomain;
          this.emit(conversationId, this.domainQuestion());
        }
        return;
      }

      case SessionStep.AwaitDomain:
        session.step = SessionStep.AwaitDifficulty;
        this.emit(conversationId, this.difficultyQuestion());
        return;

      case SessionStep.AwaitDifficulty:
        session.step = SessionStep.AwaitDatasetSize;
        this.emit(conversationId, this.datasetSizeQuestion());
        return;

      case SessionStep.AwaitDatasetSize:
        session.step = SessionStep.Closed;
        this.emit(conversationId, this.finalNarrowed());
        return;

      default:
        this.logger.warn(
          `Unexpected message in step="${session.step}" for conversationId="${conversationId}"`
        );
    }
  }

  private emit(conversationId: string, payload: AgentMessagePayload): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;
    session.emitter.emit('message', payload);
  }

  private initialQuestion(): AgentMessagePayload {
    return {
      type: 'question',
      isFinal: false,
      content: {
        kind: 'question',
        label: 'Какой бенчмарк вы ищете? Опишите вашу задачу',
        options: null,
      },
    };
  }

  private yesNoQuestion(): AgentMessagePayload {
    return {
      type: 'question',
      isFinal: false,
      content: {
        kind: 'question',
        label: 'Мы нашли подходящий бенчмарк: BENCH_001. Он вам подходит?',
        options: [
          { id: '1', label: 'Да, подходит' },
          { id: '2', label: 'Нет, не подходит' },
        ],
      },
    };
  }

  private domainQuestion(): AgentMessagePayload {
    return {
      type: 'question',
      isFinal: false,
      content: {
        kind: 'question',
        label: 'Какой домен вас интересует?',
        options: [
          { id: '1', label: 'NLP' },
          { id: '2', label: 'CV' },
          { id: '3', label: 'Multimodal' },
        ],
      },
    };
  }

  private difficultyQuestion(): AgentMessagePayload {
    return {
      type: 'question',
      isFinal: false,
      content: {
        kind: 'question',
        label: 'Какой уровень сложности?',
        options: [
          { id: '1', label: 'Базовый' },
          { id: '2', label: 'Средний' },
          { id: '3', label: 'Продвинутый' },
        ],
      },
    };
  }

  private datasetSizeQuestion(): AgentMessagePayload {
    return {
      type: 'question',
      isFinal: false,
      content: {
        kind: 'question',
        label: 'Какой размер датасета предпочтителен?',
        options: [
          { id: '1', label: 'Маленький (< 1000)' },
          { id: '2', label: 'Средний (1000-10000)' },
          { id: '3', label: 'Большой (> 10000)' },
        ],
      },
    };
  }

  private finalAccepted(): AgentMessagePayload {
    return {
      type: 'result',
      isFinal: true,
      content: {
        kind: 'result',
        label: 'Отлично! Вы выбрали бенчмарк BENCH_001',
        benchmarkId: 'BENCH_001',
        status: 'finished',
      },
    };
  }

  private finalNarrowed(): AgentMessagePayload {
    return {
      type: 'result',
      isFinal: true,
      content: {
        kind: 'result',
        label: 'По вашим ответам подобран бенчмарк BENCH_002',
        benchmarkId: 'BENCH_002',
        status: 'done',
      },
    };
  }
}
