import { ApiProperty } from '@nestjs/swagger';

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

class ServiceHealthDto {
  @ApiProperty({ example: 'postgresql', description: 'Service name' })
  name: string;

  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.HEALTHY, description: 'Service status' })
  status: ServiceStatus;

  @ApiProperty({ example: 150, description: 'Response time in milliseconds' })
  responseTime: number;

  @ApiProperty({ example: '99.9%', description: 'Service uptime percentage' })
  uptime: string;

  @ApiProperty({ example: 'Connected successfully', description: 'Status message' })
  message: string;

  @ApiProperty({ example: '2023-08-22T10:30:00Z', description: 'Last check timestamp' })
  lastCheck: string;

  @ApiProperty({ 
    example: { version: '15.3', connections: 5 }, 
    description: 'Additional service metadata',
    required: false 
  })
  metadata?: Record<string, any>;
}

class SystemResourcesDto {
  @ApiProperty({ example: 45.2, description: 'CPU usage percentage' })
  cpuUsage: number;

  @ApiProperty({ example: 68.7, description: 'Memory usage percentage' })
  memoryUsage: number;

  @ApiProperty({ example: 2048, description: 'Total memory in MB' })
  totalMemory: number;

  @ApiProperty({ example: 1405, description: 'Used memory in MB' })
  usedMemory: number;

  @ApiProperty({ example: 25.3, description: 'Disk usage percentage' })
  diskUsage: number;

  @ApiProperty({ example: 500000, description: 'Total disk space in MB' })
  totalDisk: number;

  @ApiProperty({ example: 126500, description: 'Used disk space in MB' })
  usedDisk: number;

  // Additional properties for compatibility with tests
  cpu?: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };

  memory?: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };

  disk?: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
}

class QueueStatusDto {
  @ApiProperty({ example: 'file-processing', description: 'Queue name' })
  name: string;

  @ApiProperty({ example: 15, description: 'Number of waiting jobs' })
  waiting: number;

  @ApiProperty({ example: 3, description: 'Number of active jobs' })
  active: number;

  @ApiProperty({ example: 127, description: 'Number of completed jobs' })
  completed: number;

  @ApiProperty({ example: 2, description: 'Number of failed jobs' })
  failed: number;

  @ApiProperty({ example: 5, description: 'Number of active workers' })
  workers: number;
}

class ApplicationMetricsDto {
  @ApiProperty({ example: 1250, description: 'Total users count' })
  totalUsers: number;

  @ApiProperty({ example: 45, description: 'Active users in last 24h' })
  activeUsers: number;

  @ApiProperty({ example: 3420, description: 'Total datasets processed' })
  totalDatasets: number;

  @ApiProperty({ example: 18750, description: 'Total PII findings' })
  totalFindings: number;

  @ApiProperty({ example: 125.5, description: 'Average processing time in seconds' })
  averageProcessingTime: number;

  @ApiProperty({ example: 99.8, description: 'Success rate percentage' })
  successRate: number;

  // Additional properties for compatibility with tests
  totalJobs?: number;
  successfulJobs?: number;
  failedJobs?: number;
  errorRate?: number;
  requestsPerMinute?: number;
  responseTime?: number;
}

export class SystemHealthResponseDto {
  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.HEALTHY, description: 'Overall system status' })
  overallStatus: ServiceStatus;

  @ApiProperty({ example: '2023-08-22T10:30:00Z', description: 'Health check timestamp' })
  timestamp: string;

  @ApiProperty({ example: '1.2.3', description: 'System version' })
  version: string;

  @ApiProperty({ example: 86400, description: 'System uptime in seconds' })
  uptime: number;

  @ApiProperty({ type: [ServiceHealthDto], description: 'Individual service health status' })
  services: ServiceHealthDto[];

  @ApiProperty({ type: SystemResourcesDto, description: 'System resource usage' })
  resources: SystemResourcesDto;

  @ApiProperty({ type: [QueueStatusDto], description: 'Job queue status' })
  queues: QueueStatusDto[];

  @ApiProperty({ type: ApplicationMetricsDto, description: 'Application metrics' })
  metrics: ApplicationMetricsDto;
}