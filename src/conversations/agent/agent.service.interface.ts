import { AgentMessagePayload, AgentOutgoingPayload } from '../types';

export type AgentMessageCallback = (data: AgentMessagePayload) => void;


export abstract class IAgentService {
  abstract connect(conversationId: string): void;

  abstract onMessage(
    conversationId: string,
    callback: AgentMessageCallback,
  ): void;

  abstract send(conversationId: string, data: AgentOutgoingPayload): void;

  abstract close(conversationId: string): void;
}
