import { Provider } from '@nestjs/common';
import { CatalogRepository } from './catalog.repository';
import { ICatalogRepository } from './catalog.repository.interface';

export const catalogRepositoryProvider: Provider = {
  provide: ICatalogRepository,
  useClass: CatalogRepository,
};
