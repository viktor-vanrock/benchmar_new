import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BenchmarkDifficulty,
  BenchmarkLanguage,
  BenchmarkLinkType,
  BenchmarkModality,
  BenchmarkModalityDirection,
  BenchmarkTaskType,
  BenchmarkValidationStatus,
} from '@/generated/prisma/client';

export class BenchmarkCodebaseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  url!: string;
}

export class BenchmarkLengthDistributionDto {
  @IsInt()
  @Min(0)
  min!: number;

  @IsInt()
  @Min(0)
  median!: number;

  @IsInt()
  @Min(0)
  max!: number;
}

export class BenchmarkExampleDto {
  @IsString()
  @IsNotEmpty()
  input!: string;

  @IsString()
  @IsNotEmpty()
  output!: string;

  @IsString()
  @IsOptional()
  explanation?: string;
}

export class BenchmarkReferenceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  url!: string;
}

export class BenchmarkLinkDto {
  @IsEnum(BenchmarkLinkType)
  type!: BenchmarkLinkType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  url!: string;
}

export class BenchmarkModalityDto {
  @IsEnum(BenchmarkModality)
  modality!: BenchmarkModality;

  @IsEnum(BenchmarkModalityDirection)
  @IsOptional()
  direction?: BenchmarkModalityDirection;
}

export class CreateSubDatasetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BenchmarkTaskType)
  @IsOptional()
  taskType?: BenchmarkTaskType;

  @IsInt()
  @Min(0)
  @IsOptional()
  sizeInSamples?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  medianSampleSizeWords?: number;

  @ValidateNested()
  @Type(() => BenchmarkLengthDistributionDto)
  @IsOptional()
  requestLengthDist?: BenchmarkLengthDistributionDto;

  @ValidateNested()
  @Type(() => BenchmarkLengthDistributionDto)
  @IsOptional()
  responseLengthDist?: BenchmarkLengthDistributionDto;

  @IsString()
  @IsOptional()
  split?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  domains?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subdomains?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenchmarkExampleDto)
  @IsOptional()
  examples?: BenchmarkExampleDto[];
}

export class CreateCatalogBenchmarkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  id!: string;

  @IsString()
  @IsOptional()
  suiteId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  taskDescription?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  instructionsEn?: string;

  @ValidateNested()
  @Type(() => BenchmarkCodebaseDto)
  @IsOptional()
  codebase?: BenchmarkCodebaseDto;

  @IsString()
  @IsOptional()
  macroGroup?: string;

  @IsEnum(BenchmarkTaskType)
  @IsOptional()
  taskType?: BenchmarkTaskType;

  @IsEnum(BenchmarkModality)
  @IsOptional()
  modality?: BenchmarkModality;

  @IsEnum(BenchmarkLanguage)
  @IsOptional()
  language?: BenchmarkLanguage;

  @IsEnum(BenchmarkDifficulty)
  @IsOptional()
  difficulty?: BenchmarkDifficulty;

  @IsNumber()
  @IsOptional()
  confidenceScore?: number;

  @IsString()
  @IsOptional()
  confidentialityLevel?: string;

  @IsString()
  @IsOptional()
  knowledgeLevel?: string;

  @IsString()
  @IsOptional()
  importance?: string;

  @IsString()
  @IsOptional()
  importanceComment?: string;

  @IsString()
  @IsOptional()
  contextFieldFormat?: string;

  @IsString()
  @IsOptional()
  answerFieldFormat?: string;

  @IsString()
  @IsOptional()
  evaluationLogic?: string;

  @IsNumber()
  @IsOptional()
  humanBaseline?: number;

  @IsString()
  @IsOptional()
  humanBaselineNotes?: string;

  @IsString()
  @IsOptional()
  recommendedMetricsDescription?: string;

  @IsString()
  @IsOptional()
  requiredGigaChatQualityLevel?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sizeInSamples?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  medianSampleSizeWords?: number;

  @ValidateNested()
  @Type(() => BenchmarkLengthDistributionDto)
  @IsOptional()
  requestLengthDist?: BenchmarkLengthDistributionDto;

  @ValidateNested()
  @Type(() => BenchmarkLengthDistributionDto)
  @IsOptional()
  responseLengthDist?: BenchmarkLengthDistributionDto;

  @IsBoolean()
  @IsOptional()
  fewShot?: boolean;

  @IsBoolean()
  @IsOptional()
  rag?: boolean;

  @IsBoolean()
  @IsOptional()
  tools?: boolean;

  @IsBoolean()
  @IsOptional()
  reasoning?: boolean;

  @IsBoolean()
  @IsOptional()
  longContext?: boolean;

  @IsBoolean()
  @IsOptional()
  isDifficultyAutoCalculated?: boolean;

  @IsString()
  @IsOptional()
  difficultyCalculationComment?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subGroups?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  abilityTaxons?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  abilityTags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  domains?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subdomains?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenchmarkModalityDto)
  @IsOptional()
  modalities?: BenchmarkModalityDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metrics?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenchmarkExampleDto)
  @IsOptional()
  examples?: BenchmarkExampleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenchmarkReferenceDto)
  @IsOptional()
  references?: BenchmarkReferenceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenchmarkLinkDto)
  @IsOptional()
  links?: BenchmarkLinkDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubDatasetDto)
  @IsOptional()
  subDatasets?: CreateSubDatasetDto[];

  @IsString()
  @IsOptional()
  gigaMetricsCodebaseUrl?: string;

  @IsString()
  @IsOptional()
  gigaMetricAdapterName?: string;

  @IsString()
  @IsOptional()
  gigaMetricSetUrl?: string;

  @IsString()
  @IsOptional()
  gigaMetricLaunchCommand?: string;

  @IsEnum(BenchmarkValidationStatus)
  @IsOptional()
  validationStatus?: BenchmarkValidationStatus;

  @IsBoolean()
  @IsOptional()
  isGenerated?: boolean;

  @IsString()
  @IsOptional()
  jiraTicketId?: string;
}
