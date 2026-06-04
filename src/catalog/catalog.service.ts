import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InfiniteDataResponseType } from '@/common/types/infiniteDataResponse.type';
import { CatalogMapper } from './catalog.mapper';
import { BenchmarkCatalogQueryDto } from './dto/benchmarkCatalogQueryDto.dto';
import { CreateCatalogBenchmarkDto } from './dto/createCatalogBenchmark.dto';
import { UpdateCatalogBenchmarkDto } from './dto/updateCatalogBenchmark.dto';
import { ICatalogRepository } from './repository/catalog.repository.interface';
import { BenchmarkType, CatalogFilterOptionsType } from './types';


@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @Inject(ICatalogRepository)
    private readonly catalogRepository: ICatalogRepository,
    private readonly catalogMapper: CatalogMapper
  ) {}

  async findAllBenchmark(
    query: BenchmarkCatalogQueryDto
  ): Promise<InfiniteDataResponseType<BenchmarkType>> {
    this.logger.debug('Finding all benchmarks');

    const result = await this.catalogRepository.findAllBenchmark(query);

    return {
      data: this.catalogMapper.toDtoList(result.data),
      total: result.total,
    };
  }

  async findBenchmarkById(id: string): Promise<BenchmarkType> {
    this.logger.debug(`Finding benchmark by id="${id}"`);

    const benchmark = await this.catalogRepository.findBenchmarkById(id);

    if (!benchmark) {
      this.logger.warn(`Benchmark with id="${id}" was not found`);
      throw new NotFoundException(`Benchmark with id "${id}" was not found`);
    }

    return this.catalogMapper.toDto(benchmark);
  }

  async createBenchmark(
    dto: CreateCatalogBenchmarkDto
  ): Promise<BenchmarkType> {
    this.logger.debug(`Creating benchmark id="${dto.id}"`);

    const benchmark = await this.catalogRepository.createBenchmark(dto);

    this.logger.log(`Benchmark created successfully: id="${benchmark.id}"`);

    return this.catalogMapper.toDto(benchmark);
  }

  async updateBenchmarkById(
    id: string,
    dto: UpdateCatalogBenchmarkDto
  ): Promise<BenchmarkType> {
    this.logger.debug(`Updating benchmark id="${id}"`);

    const existingBenchmark =
      await this.catalogRepository.findBenchmarkById(id);

    if (!existingBenchmark) {
      this.logger.warn(`Benchmark with id="${id}" was not found`);
      throw new NotFoundException(`Benchmark with id "${id}" was not found`);
    }

    const benchmark = await this.catalogRepository.updateBenchmarkById(
      id,
      dto
    );

    this.logger.log(`Benchmark updated successfully: id="${benchmark.id}"`);

    return this.catalogMapper.toDto(benchmark);
  }

  async softDeleteBenchmarkById(id: string): Promise<void> {
    this.logger.debug(`Deleting benchmark id="${id}"`);

    const existingBenchmark =
      await this.catalogRepository.findBenchmarkById(id);

    if (!existingBenchmark) {
      this.logger.warn(`Benchmark with id="${id}" was not found`);
      throw new NotFoundException(`Benchmark with id "${id}" was not found`);
    }

    await this.catalogRepository.softDeleteBenchmarkById(id);

    this.logger.log(`Benchmark deleted successfully: id="${id}"`);
  }

  async getFilterOptions(): Promise<CatalogFilterOptionsType> {
    this.logger.debug('Getting catalog filter options');

    return this.catalogRepository.getFilterOptions();
  }
}
