import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { IsBoolean } from '@/common/decorators/boolean.decorator';
import { IsRepeatedStringQuery } from '@/common/decorators/repeatedStringQuery.decorator';
import { PaginationDto } from '@/common/dtos/paginationDto.dto';
import { BenchmarkLanguage, BenchmarkDifficulty, BenchmarkTaskType, BenchmarkModality } from '@/generated/prisma/enums';

export enum BenchmarkSortColumn {
  CreatedAt = 'createdAt',
  Name = 'name',
  SizeInSamples = 'sizeInSamples',
  Difficulty = 'difficulty',
  Language = 'language'
}

export class BenchmarkCatalogQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BenchmarkSortColumn)
  sortColumn?: BenchmarkSortColumn = BenchmarkSortColumn.CreatedAt;

  @IsOptional()
  @IsRepeatedStringQuery()
  macroGroups?: string[];

  @IsOptional()
  @IsRepeatedStringQuery()
  subGroups?: string[];

  @IsOptional()
  @IsRepeatedStringQuery()
  abilityTaxons?: string[];

  @IsOptional()
  @IsRepeatedStringQuery()
  abilityTags?: string[];

  @IsOptional()
  @IsRepeatedStringQuery()
  skills?: string[];

  @IsOptional()
  @IsRepeatedStringQuery()
  domains?: string[];

  @IsOptional()
  @IsRepeatedStringQuery()
  subdomains?: string[];

  @IsOptional()
  @IsRepeatedStringQuery()
  @IsEnum(BenchmarkLanguage, { each: true })
  languages?: BenchmarkLanguage[];

  @IsOptional()
  @IsRepeatedStringQuery()
  @IsEnum(BenchmarkDifficulty, { each: true })
  difficulties?: BenchmarkDifficulty[];

  @IsOptional()
  @IsRepeatedStringQuery()
  @IsEnum(BenchmarkTaskType, { each: true })
  taskTypes?: BenchmarkTaskType[];

  @IsOptional()
  @IsRepeatedStringQuery()
  @IsEnum(BenchmarkModality, { each: true })
  modalities?: BenchmarkModality[];

  @IsOptional()
  @IsBoolean()
  fewShot?: boolean;

  @IsOptional()
  @IsBoolean()
  rag?: boolean;

  @IsOptional()
  @IsBoolean()
  tools?: boolean;

  @IsOptional()
  @IsBoolean()
  reasoning?: boolean;

  @IsOptional()
  @IsBoolean()
  longContext?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeMax?: number;
}
