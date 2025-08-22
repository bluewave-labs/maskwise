import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Number of recent scans/jobs',
    example: 12,
  })
  recentScans: number;

  @ApiProperty({
    description: 'Total number of datasets processed',
    example: 45,
  })
  totalDatasets: number;

  @ApiProperty({
    description: 'Total number of PII findings detected',
    example: 1532,
  })
  piiFindings: number;

  @ApiProperty({
    description: 'Number of active projects',
    example: 8,
  })
  activeProjects: number;
}