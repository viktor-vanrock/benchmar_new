import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMetricDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string | null;

  @IsUUID()
  priorityId!: string;

  @IsUUID()
  directionId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minValue?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxValue?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetValue?: number | null;

  @IsOptional()
  @IsString()
  evaluationLogic?: string | null;

  @IsOptional()
  @IsString()
  requiredGigaChatQualityLevel?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
