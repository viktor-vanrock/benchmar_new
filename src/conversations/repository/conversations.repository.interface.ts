import { PaginationDto } from '@/common/dtos/paginationDto.dto';
import { InfiniteDataResponseType } from '@/common/types/infiniteDataResponse.type';
import {
  Conversation,
  ConversationIntent,
  ConversationStatus,
  Message,
  MessageKind,
  Prisma,
} from '@/generated/prisma/client';
import { ConversationWithMessages } from '../types';

export type CreateMessageInput = {
  conversationId: string;
  role: 'agent' | 'user';
  kind: MessageKind;
  content: string;
  optionId?: string | null;
  options?: Prisma.InputJsonValue | null;
};

export abstract class IConversationsRepository {
  abstract createConversation(userId: string): Promise<Conversation>;

  abstract findAll(
    query: PaginationDto,
  ): Promise<InfiniteDataResponseType<Conversation>>;

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
