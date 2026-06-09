import { Prisma } from '@/generated/prisma/client';

export const conversationFullInclude = {
  messages: {
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

export type AgentMessagePayload = {
  type: 'question' | 'result';
  isFinal: boolean;
  content: AgentQuestionContent | AgentResultContent;
};

export type UserMessageContent =
  | { kind: 'text'; label: string }
  | { kind: 'option'; id: string; label: string };

export type HistoryEntry =
  | { role: 'agent'; content: AgentQuestionContent }
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
