import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportLayoutDto } from './create-report-template.dto';

export enum ReportFormat {
  JSON = 'JSON',
  PDF = 'PDF',
}

class ReportFiltersDto {
  @ApiProperty({ 
    description: 'Date range for report data',
    example: '7d',
    required: false
  })
  @IsOptional()
  @IsString()
  range?: string;

  @ApiProperty({ 
    description: 'Custom start date (ISO string)',
    example: '2025-08-17T00:00:00.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: 'Custom end date (ISO string)',
    example: '2025-08-24T23:59:59.999Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    description: 'Project ID filter',
    example: 'cm123456789',
    required: false
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ 
    description: 'Entity type filter for PII analysis',
    example: 'EMAIL_ADDRESS',
    required: false
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ 
    description: 'File type filter',
    example: 'PDF',
    required: false
  })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiProperty({ 
    description: 'Policy name filter for compliance data',
    example: 'GDPR Compliance',
    required: false
  })
  @IsOptional()
  @IsString()
  policyName?: string;
}

export class GenerateReportDto {
  @ApiProperty({ 
    description: 'Template ID to use for report generation',
    example: 'cm123456789',
    required: false
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ 
    description: 'Custom layout (if not using template)',
    required: false,
    type: () => ReportLayoutDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportLayoutDto)
  customLayout?: ReportLayoutDto;

  @ApiProperty({ 
    description: 'Report output format',
    enum: ReportFormat,
    example: ReportFormat.PDF
  })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiProperty({ 
    description: 'Report title override',
    example: 'Weekly PII Analysis - August 2025',
    required: false
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ 
    description: 'Global filters applied to all data sources',
    required: false,
    type: ReportFiltersDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;

  @ApiProperty({ 
    description: 'Report metadata and notes',
    example: { 
      author: 'John Doe',
      purpose: 'Monthly compliance review',
      notes: 'Generated for board presentation'
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: object;
}