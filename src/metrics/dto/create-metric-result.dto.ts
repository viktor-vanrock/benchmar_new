import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMetricResultDto {
  @ApiProperty({ example: 'postman-mmlu-ru-math-123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  testId!: string;

  @ApiPropertyOptional({ example: 'postman-mmlu-ru-math-subset-123' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  subsetId?: string;

  @ApiProperty({ example: '5e2f13fb-7d3d-4c7a-8e48-854d1a57f1d6' })
  @IsUUID()
  metricId!: string;

  @ApiProperty({ example: 'gigachat-2-pro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  modelId!: string;

  @ApiProperty({ example: 87.34 })
  @Type(() => Number)
  @IsNumber()
  value!: number;

  @ApiPropertyOptional({ example: '87.34%' })
  @IsOptional()
  @IsString()
  rawValue?: string;

  @ApiPropertyOptional({ example: '2026-05-26T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  obtainedAt?: string;

  @ApiPropertyOptional({ example: 'manual-postman' })
  @IsOptional()
  @IsString()
  importSource?: string;

  @ApiPropertyOptional({ example: { run: 'local' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
