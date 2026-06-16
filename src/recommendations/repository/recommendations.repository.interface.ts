import {
  Recommendation,
  RecommendationStatus,
} from '@/generated/prisma/client';

export type CreateRecommendationsInput = {
  conversationId: string;
  benchmarkIds: string[];
};

export abstract class IRecommendationsRepository {
  abstract createMany(
    data: CreateRecommendationsInput,
  ): Promise<Recommendation[]>;

  abstract findByConversationId(
    conversationId: string,
  ): Promise<Recommendation[]>;

  abstract findById(id: string): Promise<Nullable<Recommendation>>;

  abstract updateStatus(
    id: string,
    status: RecommendationStatus,
  ): Promise<Recommendation>;
}
