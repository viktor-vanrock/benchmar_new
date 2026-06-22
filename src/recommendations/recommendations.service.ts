import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Recommendation } from '@/generated/prisma/client';
import { IRecommendationsRepository } from './repository/recommendations.repository.interface';
import {
  CreateRecommendationsParams,
  UpdateRecommendationStatusParams,
} from './types';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @Inject(IRecommendationsRepository)
    private readonly repository: IRecommendationsRepository
  ) {}

  async createMany(
    params: CreateRecommendationsParams
  ): Promise<Recommendation[]> {
    this.logger.debug(
      `Persisting recommendations for conversationId="${params.conversationId}"`
    );

    return this.repository.createMany({
      conversationId: params.conversationId,
      benchmarkIds: params.benchmarkIds,
    });
  }

  async findByConversationId(
    conversationId: string
  ): Promise<Recommendation[]> {
    this.logger.debug(
      `Fetching recommendations for conversationId="${conversationId}"`
    );

    return this.repository.findByConversationId(conversationId);
  }

  async findById(id: string): Promise<Recommendation> {
    const recommendation = await this.repository.findById(id);
    if (!recommendation) {
      throw new NotFoundException(`Recommendation "${id}" was not found`);
    }
    return recommendation;
  }

  async updateStatus(
    params: UpdateRecommendationStatusParams
  ): Promise<Recommendation> {
    const recommendation = await this.repository.findById(params.id);
    if (!recommendation) {
      throw new NotFoundException(
        `Recommendation "${params.id}" was not found`
      );
    }

    return this.repository.updateStatus(params.id, params.status);
  }
}
