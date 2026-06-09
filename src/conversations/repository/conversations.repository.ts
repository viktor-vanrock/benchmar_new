import { Injectable, Logger } from '@nestjs/common';
import {
  Conversation,
  ConversationIntent,
  ConversationStatus,
  Message,
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ConversationWithMessages, conversationFullInclude } from '../types';
import {
  CreateMessageInput,
  IConversationsRepository,
} from './conversations.repository.interface';

@Injectable()
export class ConversationsRepository implements IConversationsRepository {
  private readonly logger = new Logger(ConversationsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createConversation(userId: string): Promise<Conversation> {
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
      },
    });

    this.logger.log(`Conversation created: id="${conversation.id}"`);

    return conversation;
  }

  async findAll(): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdWithMessages(
    id: string
  ): Promise<Nullable<ConversationWithMessages>> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: conversationFullInclude,
    });
  }

  async findById(id: string): Promise<Nullable<Conversation>> {
    return this.prisma.conversation.findUnique({
      where: { id },
    });
  }

  async createMessage(data: CreateMessageInput): Promise<Message> {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        kind: data.kind,
        content: data.content,
        optionId: data.optionId ?? null,
        options:
          data.options === undefined || null === data.options
            ? Prisma.JsonNull
            : data.options,
      },
    });
  }

  async updateStatus(
    id: string,
    status: ConversationStatus
  ): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { status },
    });
  }

  async updateIntent(
    id: string,
    intent: ConversationIntent | null
  ): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { intent },
    });
  }
}
