import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { recommendationsRepositoryProvider } from './repository/recommendations.repository.provider';

@Module({
  providers: [
    RecommendationsService,
    recommendationsRepositoryProvider,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
