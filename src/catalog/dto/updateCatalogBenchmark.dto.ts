import { PartialType } from '@nestjs/swagger';
import { CreateCatalogBenchmarkDto } from './createCatalogBenchmark.dto';

export class UpdateCatalogBenchmarkDto extends PartialType(
  CreateCatalogBenchmarkDto
) { }
