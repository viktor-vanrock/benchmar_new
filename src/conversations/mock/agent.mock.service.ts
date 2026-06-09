import { EventEmitter } from 'events';
import { Injectable, Logger } from '@nestjs/common';
import { IAgentService } from '../agent/agent.service.interface';
import {
  AgentMessagePayload,
  AgentOutgoingPayload,
  HistoryEntry,
} from '../types';

type SessionStep =
  | 'await_init'
  | 'await_initial_text'
  | 'await_yes_no'
  | 'await_domain'
  | 'await_difficulty'
  | 'await_dataset_size'
  | 'closed';

type SessionState = {
  emitter: EventEmitter;
  step: SessionStep;
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
      step: 'await_init',
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
    if (!session || 'closed' === session.step) {
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
    session.step = 'closed';
    this.sessions.delete(conversationId);

    this.logger.log(`Mock closed: conversationId="${conversationId}"`);
  }

  private handle(conversationId: string, data: AgentOutgoingPayload): void {
    const session = this.sessions.get(conversationId);
    if (!session || 'closed' === session.step) return;

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

    if (0 === userAnswers.length) {
      session.step = 'await_initial_text';
      this.emit(conversationId, this.initialQuestion());
      return;
    }

    if (1 === userAnswers.length) {
      session.step = 'await_yes_no';
      this.emit(conversationId, this.yesNoQuestion());
      return;
    }

    const yesNo = userAnswers[1];
    const acceptedFirst =
      'option' === yesNo.content.kind && '1' === yesNo.content.id;

    if (acceptedFirst) {
      session.step = 'closed';
      this.emit(conversationId, this.finalAccepted());
      return;
    }

    if (2 === userAnswers.length) {
      session.step = 'await_domain';
      this.emit(conversationId, this.domainQuestion());
      return;
    }

    if (3 === userAnswers.length) {
      session.step = 'await_difficulty';
      this.emit(conversationId, this.difficultyQuestion());
      return;
    }

    if (4 === userAnswers.length) {
      session.step = 'await_dataset_size';
      this.emit(conversationId, this.datasetSizeQuestion());
      return;
    }

    session.step = 'closed';
    this.emit(conversationId, this.finalNarrowed());
  }

  private handleClientMessage(
    conversationId: string,
    data: { content: { kind: 'text' | 'option'; id?: string; label: string } },
    session: SessionState
  ): void {
    switch (session.step) {
      case 'await_initial_text':
        session.step = 'await_yes_no';
        this.emit(conversationId, this.yesNoQuestion());
        return;

      case 'await_yes_no': {
        const acceptedFirst =
          'option' === data.content.kind && '1' === data.content.id;
        if (acceptedFirst) {
          session.step = 'closed';
          this.emit(conversationId, this.finalAccepted());
        } else {
          session.step = 'await_domain';
          this.emit(conversationId, this.domainQuestion());
        }
        return;
      }

      case 'await_domain':
        session.step = 'await_difficulty';
        this.emit(conversationId, this.difficultyQuestion());
        return;

      case 'await_difficulty':
        session.step = 'await_dataset_size';
        this.emit(conversationId, this.datasetSizeQuestion());
        return;

      case 'await_dataset_size':
        session.step = 'closed';
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
