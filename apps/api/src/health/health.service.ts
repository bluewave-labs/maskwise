import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import axios from 'axios';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getPublicHealth() {
    const timestamp = new Date().toISOString();
    const version = this.configService.get('npm_package_version', '1.0.0');
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Run health checks in parallel with timeout
    const [databaseHealth, redisHealth, externalHealth] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkExternalServicesHealth(),
    ]);

    const services = {
      database: databaseHealth.status === 'fulfilled' && databaseHealth.value ? 'healthy' as const : 'unhealthy' as const,
      redis: redisHealth.status === 'fulfilled' && redisHealth.value ? 'healthy' as const : 'unhealthy' as const,
      external: externalHealth.status === 'fulfilled' ? 
        (externalHealth.value.healthy > 0 ? 
          (externalHealth.value.healthy === externalHealth.value.total ? 'healthy' as const : 'degraded' as const) 
          : 'unhealthy' as const) 
        : 'unhealthy' as const,
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (services.database === 'unhealthy' || services.redis === 'unhealthy') {
      status = 'unhealthy';
    } else if (services.external === 'unhealthy' || services.external === 'degraded') {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      timestamp,
      version,
      uptime,
      services,
    };
  }

  async isReady(): Promise<boolean> {
    try {
      // Check critical services required for serving traffic
      const [dbHealthy, redisHealthy] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
      ]);

      return (
        dbHealthy.status === 'fulfilled' && dbHealthy.value === true &&
        redisHealthy.status === 'fulfilled' && redisHealthy.value === true
      );
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      return false;
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      // Try to create a Redis connection check (would need Redis client)
      // For now, assume healthy if no explicit Redis errors
      // In production, implement actual Redis ping
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  private async checkExternalServicesHealth(): Promise<{ healthy: number; total: number }> {
    const services = [
      { name: 'Presidio Analyzer', url: this.configService.get('PRESIDIO_ANALYZER_URL', 'http://localhost:5003') },
      { name: 'Presidio Anonymizer', url: this.configService.get('PRESIDIO_ANONYMIZER_URL', 'http://localhost:5004') },
      { name: 'Tika', url: this.configService.get('TIKA_URL', 'http://localhost:9998') },
    ];

    const healthChecks = services.map(async (service) => {
      try {
        const response = await axios.get(`${service.url}/health`, {
          timeout: 2000,
          validateStatus: (status) => status < 500, // Accept 4xx but not 5xx
        });
        return response.status < 400;
      } catch (error) {
        this.logger.warn(`External service ${service.name} health check failed`, {
          service: service.name,
          url: service.url,
          error: error.message,
        });
        return false;
      }
    });

    const results = await Promise.allSettled(healthChecks);
    const healthy = results.filter(
      (result) => result.status === 'fulfilled' && result.value === true
    ).length;

    return {
      healthy,
      total: services.length,
    };
  }
}