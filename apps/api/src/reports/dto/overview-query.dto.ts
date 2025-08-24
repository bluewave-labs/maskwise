import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class OverviewQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for the report period (ISO string)',
    example: '2025-08-17T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for the report period (ISO string)',
    example: '2025-08-24T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Predefined time range',
    enum: ['7d', '30d', '90d', 'all'],
    example: '7d',
  })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'all'])
  range?: '7d' | '30d' | '90d' | 'all';

  @ApiPropertyOptional({
    description: 'Timezone offset in minutes from UTC',
    example: -480,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  timezoneOffset?: number;
}