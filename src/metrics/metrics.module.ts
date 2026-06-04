import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { metricsRepositoryProvider } from './repositories/metrics-repository.provider';

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    metricsRepositoryProvider,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
