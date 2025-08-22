import { IsOptional, IsNumber, IsString, IsBoolean, IsArray, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class FileConfigDto {
  @ApiProperty({ example: 100, description: 'Maximum file size in MB' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxSize?: number;

  @ApiProperty({ example: ['txt', 'csv', 'pdf'], description: 'Allowed file types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTypes?: string[];

  @ApiProperty({ example: 30, description: 'File retention period in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  retentionDays?: number;
}

class PiiConfigDto {
  @ApiProperty({ example: 0.85, description: 'Default confidence threshold for PII detection' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultConfidenceThreshold?: number;

  @ApiProperty({ example: 'redact', description: 'Default anonymization action' })
  @IsOptional()
  @IsString()
  @IsIn(['redact', 'mask', 'replace', 'encrypt'])
  defaultAction?: 'redact' | 'mask' | 'replace' | 'encrypt';

  @ApiProperty({ example: ['EMAIL_ADDRESS', 'SSN'], description: 'Enabled PII entity types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledEntityTypes?: string[];
}

class SecurityConfigDto {
  @ApiProperty({ example: true, description: 'Enable file content scanning' })
  @IsOptional()
  @IsBoolean()
  enableFileContentScanning?: boolean;

  @ApiProperty({ example: 10, description: 'Maximum concurrent jobs' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxConcurrentJobs?: number;

  @ApiProperty({ example: 30, description: 'Job timeout in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  jobTimeoutMinutes?: number;
}

class PerformanceConfigDto {
  @ApiProperty({ example: 5, description: 'Worker concurrency level' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  workerConcurrency?: number;

  @ApiProperty({ example: 1000, description: 'Maximum queue size' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  maxQueueSize?: number;

  @ApiProperty({ example: true, description: 'Enable result caching' })
  @IsOptional()
  @IsBoolean()
  enableCaching?: boolean;
}

export class UpdateSystemConfigDto {
  @ApiProperty({ type: FileConfigDto, required: false })
  @IsOptional()
  file?: FileConfigDto;

  @ApiProperty({ type: PiiConfigDto, required: false })
  @IsOptional()
  pii?: PiiConfigDto;

  @ApiProperty({ type: SecurityConfigDto, required: false })
  @IsOptional()
  security?: SecurityConfigDto;

  @ApiProperty({ type: PerformanceConfigDto, required: false })
  @IsOptional()
  performance?: PerformanceConfigDto;
}