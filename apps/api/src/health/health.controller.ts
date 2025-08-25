import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

interface PublicHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    external: 'healthy' | 'degraded' | 'unhealthy';
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Public health check endpoint',
    description: 'Returns basic system health status for load balancers and monitoring'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        uptime: { type: 'number', description: 'Uptime in seconds' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', enum: ['healthy', 'unhealthy'] },
            redis: { type: 'string', enum: ['healthy', 'unhealthy'] },
            external: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          }
        }
      }
    }
  })
  async getHealth(): Promise<PublicHealthResponse> {
    return this.healthService.getPublicHealth();
  }

  @Get('ready')
  @ApiOperation({ 
    summary: 'Readiness probe',
    description: 'Kubernetes readiness probe - checks if application can serve traffic'
  })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async getReadiness(): Promise<{ status: string; timestamp: string }> {
    const isReady = await this.healthService.isReady();
    
    if (!isReady) {
      throw new Error('Application is not ready');
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ 
    summary: 'Liveness probe',
    description: 'Kubernetes liveness probe - checks if application is alive'
  })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  async getLiveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}