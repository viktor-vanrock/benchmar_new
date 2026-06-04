import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogMapper } from './catalog.mapper';
import { CatalogService } from './catalog.service';
import { catalogRepositoryProvider } from './repository/catalog.repository.provider';


@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    CatalogMapper,
    catalogRepositoryProvider,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
