import { EventEmitter } from 'events';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket, { RawData } from 'ws';
import { AgentEnvType } from '@/configs/types';
import { AgentMessagePayload, AgentOutgoingPayload } from '../types';
import {
  AgentMessageCallback,
  IAgentService,
} from './agent.service.interface';

export type SessionState = {
  ws: Nullable<WebSocket>;
  emitter: EventEmitter;
  /** буфер сообщений, отправленных до открытия соединения */
  pending: AgentOutgoingPayload[];
  /** счётчик неудачных попыток подключения */
  reconnectAttempt: number;
  /** таймер на следующую попытку reconnect */
  reconnectTimer: Nullable<NodeJS.Timeout>;
  /** интервал heartbeat ping */
  heartbeatInterval: Nullable<NodeJS.Timeout>;
  /** таймер ожидания pong */
  heartbeatTimeout: Nullable<NodeJS.Timeout>;
  /** флаг — пользователь сам закрыл сессию, reconnect не нужен */
  closedByUser: boolean;
};

@Injectable()
export class AgentWsService
implements IAgentService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentWsService.name);
  private readonly sessions = new Map<string, SessionState>();
  private agentConfig!: AgentEnvType;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.agentConfig = this.configService.getOrThrow<AgentEnvType>('agent');

    if (!this.agentConfig.wsUrl) {
      this.logger.warn(
        'THIRD_PARTY_WS_URL is not set — AgentWsService will fail on connect()'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const conversationId of Array.from(this.sessions.keys())) {
      this.close(conversationId);
    }
    // даём ws чуть-чуть времени корректно закрыться
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // ----------------------------------------------------------------------
  //  IAgentService
  // ----------------------------------------------------------------------

  connect(conversationId: string): void {
    if (this.sessions.has(conversationId)) {
      this.logger.warn(
        `WS session already exists for conversationId="${conversationId}"`
      );
      return;
    }

    const session: SessionState = {
      ws: null,
      emitter: new EventEmitter(),
      pending: [],
      reconnectAttempt: 0,
      reconnectTimer: null,
      heartbeatInterval: null,
      heartbeatTimeout: null,
      closedByUser: false,
    };

    this.sessions.set(conversationId, session);
    this.openSocket(conversationId);
  }

  onMessage(
    conversationId: string,
    callback: AgentMessageCallback
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) {
      this.logger.warn(
        `Cannot subscribe — no WS session for conversationId="${conversationId}"`
      );
      return;
    }
    session.emitter.on('message', callback);
  }

  send(conversationId: string, data: AgentOutgoingPayload): void {
    const session = this.sessions.get(conversationId);
    if (!session || session.closedByUser) {
      this.logger.warn(
        `Cannot send — no active WS session for conversationId="${conversationId}"`
      );
      return;
    }

    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      this.rawSend(session.ws, data, conversationId);
      return;
    }

    // CONNECTING / CLOSING / null — кладём в буфер, отправим на 'open'
    session.pending.push(data);
  }

  close(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session) {
      this.logger.debug(
        `close() called for unknown or already closed session: conversationId="${conversationId}"`
      );
      return;
    }

    session.closedByUser = true;
    this.clearTimers(session);
    session.emitter.removeAllListeners();

    if (session.ws) {
      try {
        session.ws.removeAllListeners();
        if (
          session.ws.readyState === WebSocket.OPEN
          || session.ws.readyState === WebSocket.CONNECTING
        ) {
          session.ws.close(1000, 'client_closed');
        }
      } catch (error) {
        this.logger.warn(
          `Error while closing WS for conversationId="${conversationId}": ${this.errorMessage(error)}`
        );
      }
    }

    this.sessions.delete(conversationId);
    this.logger.log(`WS session closed: conversationId="${conversationId}"`);
  }

  // ----------------------------------------------------------------------
  //  internals
  // ----------------------------------------------------------------------

  private openSocket(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session || session.closedByUser) return;

    const url = this.agentConfig.wsUrl;
    if (!url) {
      this.logger.error(
        `Cannot open WS for conversationId="${conversationId}" — THIRD_PARTY_WS_URL is empty`
      );
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(url, {
        headers: this.agentConfig.apiKey
          ? { Authorization: `Bearer ${this.agentConfig.apiKey}` }
          : undefined,
        handshakeTimeout: 10_000,
      });
    } catch (error) {
      this.logger.error(
        `WS constructor failed for conversationId="${conversationId}": ${this.errorMessage(error)}`
      );
      this.scheduleReconnect(conversationId);
      return;
    }

    session.ws = ws;

    ws.on('open', () => this.onSocketOpen(conversationId));
    ws.on('message', (raw) => this.onSocketMessage(conversationId, raw));
    ws.on('pong', () => this.onPong(conversationId));
    ws.on('error', (err) => {
      this.logger.warn(
        `WS error for conversationId="${conversationId}": ${this.errorMessage(err)}`
      );
    });
    ws.on('close', (code, reason) =>
      this.onSocketClose(conversationId, code, reason?.toString() ?? '')
    );
  }

  private onSocketOpen(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session || !session.ws) return;

    this.logger.log(`WS open: conversationId="${conversationId}"`);
    session.reconnectAttempt = 0;

    // flush буфер
    const drained = session.pending.splice(0, session.pending.length);
    for (const payload of drained) {
      this.rawSend(session.ws, payload, conversationId);
    }

    this.startHeartbeat(conversationId);
  }

  private onSocketMessage(conversationId: string, raw: RawData): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    let parsed: unknown;
    try {
      const buffer = Array.isArray(raw)
        ? Buffer.concat(raw)
        : raw instanceof ArrayBuffer
          ? Buffer.from(raw)
          : raw;
      const text = buffer.toString('utf-8');
      parsed = JSON.parse(text);
    } catch (error) {
      this.logger.warn(
        `WS payload parse failed for conversationId="${conversationId}": ${this.errorMessage(error)}`
      );
      return;
    }

    if (!this.isAgentMessagePayload(parsed)) {
      this.logger.warn(
        `WS payload invalid shape for conversationId="${conversationId}"`
      );
      return;
    }

    session.emitter.emit('message', parsed);
  }

  private onSocketClose(
    conversationId: string,
    code: number,
    reason: string
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    this.logger.log(
      `WS closed: conversationId="${conversationId}", code=${code}, reason="${reason}"`
    );

    this.clearTimers(session);
    session.ws = null;

    if (session.closedByUser) return;

    this.scheduleReconnect(conversationId);
  }

  private scheduleReconnect(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session || session.closedByUser) return;

    if (session.reconnectAttempt >= this.agentConfig.reconnectMaxAttempts) {
      this.logger.error(
        `WS reconnect attempts exhausted for conversationId="${conversationId}"`
      );
      this.close(conversationId);
      return;
    }

    const attempt = session.reconnectAttempt + 1;
    session.reconnectAttempt = attempt;

    const delay = Math.min(
      this.agentConfig.reconnectInitialDelayMs * 2 ** (attempt - 1),
      this.agentConfig.reconnectMaxDelayMs
    );

    this.logger.log(
      `WS reconnect scheduled for conversationId="${conversationId}": attempt=${attempt}, delay=${delay}ms`
    );

    session.reconnectTimer = setTimeout(() => {
      session.reconnectTimer = null;
      this.openSocket(conversationId);
    }, delay);
  }

  private startHeartbeat(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session || !session.ws) return;

    this.clearHeartbeat(session);

    session.heartbeatInterval = setInterval(() => {
      const s = this.sessions.get(conversationId);
      if (!s || !s.ws || s.ws.readyState !== WebSocket.OPEN) return;

      try {
        s.ws.ping();
      } catch (error) {
        this.logger.warn(
          `WS ping failed for conversationId="${conversationId}": ${this.errorMessage(error)}`
        );
        return;
      }

      s.heartbeatTimeout = setTimeout(() => {
        const s2 = this.sessions.get(conversationId);
        if (!s2 || !s2.ws) return;
        this.logger.warn(
          `WS heartbeat timeout for conversationId="${conversationId}", terminating`
        );
        try {
          s2.ws.terminate();
        } catch (error) {
          this.logger.warn(
            `WS terminate failed for conversationId="${conversationId}": ${this.errorMessage(error)}`
          );
        }
      }, this.agentConfig.heartbeatTimeoutMs);
    }, this.agentConfig.heartbeatIntervalMs);
  }

  private onPong(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;
    if (session.heartbeatTimeout) {
      clearTimeout(session.heartbeatTimeout);
      session.heartbeatTimeout = null;
    }
  }

  private clearHeartbeat(session: SessionState): void {
    if (session.heartbeatInterval) {
      clearInterval(session.heartbeatInterval);
      session.heartbeatInterval = null;
    }
    if (session.heartbeatTimeout) {
      clearTimeout(session.heartbeatTimeout);
      session.heartbeatTimeout = null;
    }
  }

  private clearTimers(session: SessionState): void {
    this.clearHeartbeat(session);
    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = null;
    }
  }

  private rawSend(
    ws: WebSocket,
    payload: AgentOutgoingPayload,
    conversationId: string
  ): void {
    try {
      ws.send(JSON.stringify(payload));
    } catch (error) {
      this.logger.warn(
        `WS send failed for conversationId="${conversationId}": ${this.errorMessage(error)}`
      );
    }
  }

  private isAgentMessagePayload(value: unknown): value is AgentMessagePayload {
    if (!value || typeof value !== 'object') return false;
    const obj = value as { type?: unknown; content?: unknown; isFinal?: unknown };
    if (obj.type !== 'question' && obj.type !== 'result') return false;
    if (typeof obj.isFinal !== 'boolean') return false;
    if (!obj.content || typeof obj.content !== 'object') return false;
    const content = obj.content as { kind?: unknown };
    return 'question' === content.kind || 'result' === content.kind;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
