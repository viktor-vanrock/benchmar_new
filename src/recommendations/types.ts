import { Prisma } from '@/generated/prisma/client';
import { RecommendationStatus } from '@/generated/prisma/enums';

export const recommendationFullInclude = {
  conversation: true,
} satisfies Prisma.RecommendationInclude;

export type RecommendationWithConversation =
  Prisma.RecommendationGetPayload<{
    include: typeof recommendationFullInclude;
  }>;

export type CreateRecommendationsParams = {
  conversationId: string;
  benchmarkIds: string[];
};

export type UpdateRecommendationStatusParams = {
  id: string;
  status:
    | typeof RecommendationStatus.selected
    | typeof RecommendationStatus.rejected;
};
