import { ApiProperty } from '@nestjs/swagger';

class FileConfigResponseDto {
  @ApiProperty({ example: 100, description: 'Maximum file size in MB' })
  maxSize: number;

  @ApiProperty({ example: ['txt', 'csv', 'pdf'], description: 'Allowed file types' })
  allowedTypes: string[];

  @ApiProperty({ example: 30, description: 'File retention period in days' })
  retentionDays: number;
}

class PiiConfigResponseDto {
  @ApiProperty({ example: 0.85, description: 'Default confidence threshold for PII detection' })
  defaultConfidenceThreshold: number;

  @ApiProperty({ example: 'redact', description: 'Default anonymization action' })
  defaultAction: 'redact' | 'mask' | 'replace' | 'encrypt';

  @ApiProperty({ example: ['EMAIL_ADDRESS', 'SSN'], description: 'Enabled PII entity types' })
  enabledEntityTypes: string[];
}

class SecurityConfigResponseDto {
  @ApiProperty({ example: true, description: 'Enable file content scanning' })
  enableFileContentScanning: boolean;

  @ApiProperty({ example: 10, description: 'Maximum concurrent jobs' })
  maxConcurrentJobs: number;

  @ApiProperty({ example: 30, description: 'Job timeout in minutes' })
  jobTimeoutMinutes: number;
}

class PerformanceConfigResponseDto {
  @ApiProperty({ example: 5, description: 'Worker concurrency level' })
  workerConcurrency: number;

  @ApiProperty({ example: 1000, description: 'Maximum queue size' })
  maxQueueSize: number;

  @ApiProperty({ example: true, description: 'Enable result caching' })
  enableCaching: boolean;
}

export class SystemConfigResponseDto {
  @ApiProperty({ type: FileConfigResponseDto })
  file: FileConfigResponseDto;

  @ApiProperty({ type: PiiConfigResponseDto })
  pii: PiiConfigResponseDto;

  @ApiProperty({ type: SecurityConfigResponseDto })
  security: SecurityConfigResponseDto;

  @ApiProperty({ type: PerformanceConfigResponseDto })
  performance: PerformanceConfigResponseDto;
}