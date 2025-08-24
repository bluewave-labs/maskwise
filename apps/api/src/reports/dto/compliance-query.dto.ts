import { IsOptional, IsIn, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ComplianceQueryDto {
  @ApiPropertyOptional({
    description: 'Date range for compliance analysis',
    enum: ['7d', '30d', '90d', 'all'],
    default: '7d',
    example: '7d'
  })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'all'])
  range?: '7d' | '30d' | '90d' | 'all' = '7d';

  @ApiPropertyOptional({
    description: 'Filter by specific policy name',
    example: 'GDPR Compliance'
  })
  @IsOptional()
  @IsString()
  policyName?: string;

  @ApiPropertyOptional({
    description: 'Filter by audit action type',
    example: 'DATASET_CREATED'
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: 'cm123456789'
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Custom start date (overrides range)',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Custom end date (overrides range)',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  endDate?: Date;
}