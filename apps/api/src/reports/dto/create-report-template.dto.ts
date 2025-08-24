import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject, ValidateNested, IsArray, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportComponentDto {
  @ApiProperty({ 
    description: 'Component ID from available data sources',
    example: 'overview-metrics' 
  })
  @IsString()
  id: string;

  @ApiProperty({ 
    description: 'Component type (metrics-cards, chart, table, etc.)',
    example: 'metrics-cards' 
  })
  @IsString()
  type: string;

  @ApiProperty({ 
    description: 'Layout position configuration',
    example: { x: 0, y: 0, width: 6, height: 4 }
  })
  @IsObject()
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiProperty({ 
    description: 'Component configuration and styling',
    example: { showTrend: true, colorScheme: 'blue' },
    required: false
  })
  @IsOptional()
  @IsObject()
  config?: object;

  @ApiProperty({ 
    description: 'Data source filters and parameters',
    example: { range: '7d', entityType: 'EMAIL_ADDRESS' },
    required: false
  })
  @IsOptional()
  @IsObject()
  filters?: object;
}

export class ReportLayoutDto {
  @ApiProperty({ 
    description: 'Layout grid configuration',
    example: { columns: 12, rowHeight: 80, margin: [16, 16] }
  })
  @IsObject()
  grid: {
    columns: number;
    rowHeight: number;
    margin: number[];
  };

  @ApiProperty({ 
    description: 'Report components with positioning',
    type: [ReportComponentDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportComponentDto)
  components: ReportComponentDto[];

  @ApiProperty({ 
    description: 'Global report styling and branding',
    example: { 
      headerColor: '#1e40af',
      logoUrl: 'https://example.com/logo.png',
      showPageNumbers: true
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  styling?: object;
}

export class CreateReportTemplateDto {
  @ApiProperty({ 
    description: 'Template name',
    example: 'Monthly PII Analysis Report',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    description: 'Template description',
    example: 'Comprehensive monthly review of PII detection and compliance metrics',
    required: false,
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Report layout configuration with components and positioning',
    type: ReportLayoutDto
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ReportLayoutDto)
  layout: ReportLayoutDto;

  @ApiProperty({ 
    description: 'Whether this should be the user default template',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ 
    description: 'Tags for organizing templates',
    example: ['monthly', 'pii-analysis', 'compliance'],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}