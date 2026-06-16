import { Injectable, Logger } from '@nestjs/common';
import {
  Recommendation,
  RecommendationStatus,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateRecommendationsInput,
  IRecommendationsRepository,
} from './recommendations.repository.interface';

@Injectable()
export class RecommendationsRepository implements IRecommendationsRepository {
  private readonly logger = new Logger(RecommendationsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    data: CreateRecommendationsInput
  ): Promise<Recommendation[]> {
    const { conversationId, benchmarkIds } = data;

    this.logger.debug(
      `Upserting recommendations: conversationId="${conversationId}", count=${benchmarkIds.length}`
    );

    // upsert по @@unique([conversationId, benchmarkId]) —
    // если пара уже есть, оставляем существующую запись (update no-op),
    // если нет — создаём.
    const recommendations = await this.prisma.$transaction(
      benchmarkIds.map((benchmarkId) =>
        this.prisma.recommendation.upsert({
          where: {
            conversationId_benchmarkId: {
              conversationId,
              benchmarkId,
            },
          },
          create: {
            conversationId,
            benchmarkId,
          },
          update: {},
        })
      )
    );

    this.logger.log(
      `Recommendations upserted: conversationId="${conversationId}", count=${recommendations.length}`
    );

    return recommendations;
  }

  async findByConversationId(
    conversationId: string
  ): Promise<Recommendation[]> {
    this.logger.debug(
      `Fetching recommendations: conversationId="${conversationId}"`
    );

    return this.prisma.recommendation.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Nullable<Recommendation>> {
    return this.prisma.recommendation.findUnique({
      where: { id },
    });
  }

  async updateStatus(
    id: string,
    status: RecommendationStatus
  ): Promise<Recommendation> {
    return this.prisma.recommendation.update({
      where: { id },
      data: { status },
    });
  }
}
