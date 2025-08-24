import { IsOptional, IsIn, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PIIAnalysisQueryDto {
  @ApiProperty({ 
    description: 'Date range preset', 
    enum: ['7d', '30d', '90d', 'all'], 
    required: false,
    example: '7d'
  })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'all'])
  range?: '7d' | '30d' | '90d' | 'all';

  @ApiProperty({ 
    description: 'Custom start date (ISO 8601)', 
    required: false,
    example: '2025-08-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: 'Custom end date (ISO 8601)', 
    required: false,
    example: '2025-08-24T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    description: 'Filter by entity type', 
    required: false,
    example: 'EMAIL_ADDRESS'
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ 
    description: 'Filter by file type', 
    required: false,
    example: 'PDF'
  })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiProperty({ 
    description: 'Filter by project ID', 
    required: false,
    example: 'project_123'
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}