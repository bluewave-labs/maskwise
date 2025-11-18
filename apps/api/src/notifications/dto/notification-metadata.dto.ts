import { IsOptional, IsString, IsNumber, IsArray, IsObject, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Notification metadata for job-related notifications
 */
export class JobNotificationMetadataDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'clx123abc',
    required: false
  })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiProperty({
    description: 'Dataset name',
    example: 'customer-data.csv',
    required: false
  })
  @IsOptional()
  @IsString()
  datasetName?: string;

  @ApiProperty({
    description: 'Number of PII findings detected',
    example: 42,
    required: false
  })
  @IsOptional()
  @IsNumber()
  findingsCount?: number;
}

/**
 * Notification metadata for security alerts
 */
export class SecurityNotificationMetadataDto {
  @ApiProperty({
    description: 'Type of security alert',
    example: 'failed_login',
    required: false
  })
  @IsOptional()
  @IsString()
  alertType?: string;

  @ApiProperty({
    description: 'Number of failed attempts',
    example: 5,
    required: false
  })
  @IsOptional()
  @IsNumber()
  attempts?: number;

  @ApiProperty({
    description: 'IP address of the security event',
    example: '192.168.1.100',
    required: false
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    description: 'Additional security details',
    required: false
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

/**
 * Notification metadata for system maintenance
 */
export class SystemNotificationMetadataDto {
  @ApiProperty({
    description: 'Scheduled maintenance time',
    example: '2024-01-15T02:00:00Z',
    required: false
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledTime?: Date;

  @ApiProperty({
    description: 'Maintenance duration in minutes',
    example: 120,
    required: false
  })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiProperty({
    description: 'Affected services',
    example: ['api', 'worker'],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedServices?: string[];
}

/**
 * Generic notification metadata type
 * Can be one of the specific types or a generic object
 */
export type NotificationMetadata =
  | JobNotificationMetadataDto
  | SecurityNotificationMetadataDto
  | SystemNotificationMetadataDto
  | Record<string, any>;
