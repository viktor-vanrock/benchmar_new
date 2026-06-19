import { Prisma } from '@/generated/prisma/client';
import { HypothesisGenerationWithHypotheses } from '@/hypotheses/types';

export const conversationFullInclude = {
  messages: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  recommendations: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ConversationInclude;

export type ConversationWithMessages = Prisma.ConversationGetPayload<{
  include: typeof conversationFullInclude;
}>;

export type AgentMessageOption = {
  id: string;
  label: string;
};

export type AgentQuestionContent = {
  kind: 'question';
  label: string;
  options?: AgentMessageOption[] | null;
};

export type AgentResultContent = {
  kind: 'result';
  label: string;
  benchmarkId: string;
  status: 'finished' | 'done';
};

export type AgentHypothesesContent = {
  kind: 'hypotheses';
  hypotheses: string[];
  benchmarkId: string;
};

export type AgentMessagePayload =
  | { type: 'question'; isFinal: boolean; content: AgentQuestionContent }
  | { type: 'result'; isFinal: boolean; content: AgentResultContent }
  | { type: 'hypotheses'; isFinal: boolean; content: AgentHypothesesContent }
  | { type: 'error'; isFinal: true; content: { message: string } };

export type UserMessageContent =
  | { kind: 'text'; label: string }
  | { kind: 'option'; id: string; label: string }
  | { kind: 'recommendation_selected'; benchmarkId: string }
  | { kind: 'recommendation_rejected'; benchmarkId: string };

export type HistoryEntry =
  | { role: 'agent'; content: AgentQuestionContent | AgentResultContent }
  | { role: 'user'; content: UserMessageContent };

export type AgentInitPayload = {
  type: 'init';
  intent: 'find_existing' | 'create_new' | null;
  history: HistoryEntry[];
};

export type AgentClientMessagePayload = {
  type: 'message';
  content: UserMessageContent;
};

export type AgentOutgoingPayload =
  | AgentInitPayload
  | AgentClientMessagePayload;

export type AgentMessageHandler = (payload: AgentMessagePayload) => void;

export type HypothesesGeneratedHandler = (
  generation: HypothesisGenerationWithHypotheses
) => void;

export type StartChatParams = {
  conversationId?: string;
  userId: string;
  onAgent: AgentMessageHandler;
  onHypotheses?: HypothesesGeneratedHandler;
};

export type SendUserMessageParams = {
  conversationId: string;
  kind: UserMessageContent['kind'];
  value: string;
  label?: string;
  onAgent: AgentMessageHandler;
  onHypotheses?: HypothesesGeneratedHandler;
};
