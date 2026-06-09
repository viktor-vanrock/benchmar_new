import {
  Conversation,
  ConversationIntent,
  ConversationStatus,
  Message,
  Prisma,
} from '@/generated/prisma/client';
import { ConversationWithMessages } from '../types';

export type CreateMessageInput = {
  conversationId: string;
  role: 'agent' | 'user';
  kind: 'question' | 'option' | 'text';
  content: string;
  optionId?: string | null;
  options?: Prisma.InputJsonValue | null;
};

export abstract class IConversationsRepository {
  abstract createConversation(userId: string): Promise<Conversation>;

  abstract findAll(): Promise<Conversation[]>;

  abstract findByIdWithMessages(
    id: string,
  ): Promise<Nullable<ConversationWithMessages>>;

  abstract findById(id: string): Promise<Nullable<Conversation>>;

  abstract createMessage(data: CreateMessageInput): Promise<Message>;

  abstract updateStatus(
    id: string,
    status: ConversationStatus,
  ): Promise<Conversation>;

  abstract updateIntent(
    id: string,
    intent: ConversationIntent | null,
  ): Promise<Conversation>;
}
