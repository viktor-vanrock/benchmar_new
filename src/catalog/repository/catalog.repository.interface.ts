import { InfiniteDataResponseType } from '@/common/types/infiniteDataResponse.type';
import { BenchmarkCatalogQueryDto } from '../dto/benchmarkCatalogQueryDto.dto';
import { CreateCatalogBenchmarkDto } from '../dto/createCatalogBenchmark.dto';
import { UpdateCatalogBenchmarkDto } from '../dto/updateCatalogBenchmark.dto';
import {
  BenchmarkTestWithRelations,
  CatalogFilterOptionsType,
} from '../types';

export abstract class ICatalogRepository {
  abstract findAllBenchmark(
    query: BenchmarkCatalogQueryDto,
  ): Promise<InfiniteDataResponseType<BenchmarkTestWithRelations>>;

  abstract findBenchmarkById(
    id: string,
  ): Promise<Nullable<BenchmarkTestWithRelations>>;

  abstract createBenchmark(
    data: CreateCatalogBenchmarkDto,
  ): Promise<BenchmarkTestWithRelations>;

  abstract updateBenchmarkById(
    id: string,
    data: UpdateCatalogBenchmarkDto,
  ): Promise<BenchmarkTestWithRelations>;

  abstract softDeleteBenchmarkById(id: string): Promise<void>;

  abstract getFilterOptions(): Promise<CatalogFilterOptionsType>;
}
