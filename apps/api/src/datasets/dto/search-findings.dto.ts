import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsNumber, Min, Max, IsDateString, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum EntityType {
  EMAIL_ADDRESS = 'EMAIL_ADDRESS',
  PHONE_NUMBER = 'PHONE_NUMBER',
  CREDIT_CARD = 'CREDIT_CARD',
  SSN = 'SSN',
  PERSON = 'PERSON',
  DATE_TIME = 'DATE_TIME',
  URL = 'URL',
  LOCATION = 'LOCATION',
  ORGANIZATION = 'ORGANIZATION',
  IP_ADDRESS = 'IP_ADDRESS',
  IBAN = 'IBAN',
  US_DRIVER_LICENSE = 'US_DRIVER_LICENSE',
  US_PASSPORT = 'US_PASSPORT',
  MEDICAL_LICENSE = 'MEDICAL_LICENSE',
  UK_NHS = 'UK_NHS'
}

/**
 * Search Findings DTO
 * 
 * Comprehensive search and filter parameters for global PII findings search.
 * Supports text search, entity filtering, confidence ranges, date ranges, and project/dataset filtering.
 */
export class SearchFindingsDto {
  @ApiProperty({ 
    description: 'Search query text (searches in masked text and context)', 
    example: 'john.doe@company.com',
    required: false 
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ 
    description: 'Filter by PII entity types', 
    enum: EntityType,
    isArray: true,
    example: ['EMAIL_ADDRESS', 'PHONE_NUMBER'],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EntityType, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : value?.split(',') || [])
  entityTypes?: EntityType[];

  @ApiProperty({ 
    description: 'Minimum confidence score (0.0 to 1.0)', 
    example: 0.7,
    minimum: 0,
    maximum: 1,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  minConfidence?: number;

  @ApiProperty({ 
    description: 'Maximum confidence score (0.0 to 1.0)', 
    example: 1.0,
    minimum: 0,
    maximum: 1,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  maxConfidence?: number;

  @ApiProperty({ 
    description: 'Filter findings created after this date', 
    example: '2024-01-01T00:00:00Z',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ 
    description: 'Filter findings created before this date', 
    example: '2024-12-31T23:59:59Z',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ 
    description: 'Filter by specific project IDs', 
    type: [String],
    example: ['cm123abc', 'cm456def'],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : value?.split(',') || [])
  projectIds?: string[];

  @ApiProperty({ 
    description: 'Filter by specific dataset IDs', 
    type: [String],
    example: ['cm789ghi', 'cm012jkl'],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : value?.split(',') || [])
  datasetIds?: string[];

  @ApiProperty({ 
    description: 'Page number for pagination', 
    example: 1,
    minimum: 1,
    required: false,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of results per page', 
    example: 50,
    minimum: 1,
    maximum: 200,
    required: false,
    default: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number = 50;

  @ApiProperty({ 
    description: 'Sort field for results', 
    enum: ['confidence', 'createdAt', 'entityType'],
    example: 'confidence',
    required: false,
    default: 'confidence'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['confidence', 'createdAt', 'entityType'])
  sortBy?: 'confidence' | 'createdAt' | 'entityType' = 'confidence';

  @ApiProperty({ 
    description: 'Sort order', 
    enum: ['asc', 'desc'],
    example: 'desc',
    required: false,
    default: 'desc'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Search Findings Response DTO
 */
export class SearchFindingsResponseDto {
  @ApiProperty({ description: 'Array of matching PII findings' })
  findings: any[];

  @ApiProperty({ description: 'Search metadata and statistics' })
  metadata: {
    totalResults: number;
    searchQuery?: string;
    appliedFilters: {
      entityTypes?: EntityType[];
      confidenceRange?: [number, number];
      dateRange?: [string, string];
      projects?: number;
      datasets?: number;
    };
    executionTime: number; // milliseconds
  };

  @ApiProperty({ description: 'Pagination information' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({ description: 'Entity type breakdown statistics' })
  breakdown: {
    entityType: EntityType;
    count: number;
    avgConfidence: number;
  }[];
}