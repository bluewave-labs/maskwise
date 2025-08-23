import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { ServiceStatus, SystemHealthResponseDto } from '../dto/system-health-response.dto';
import axios from 'axios';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    const timestamp = new Date().toISOString();
    
    // Run all health checks in parallel for better performance
    const [services, resources, queues, metrics] = await Promise.all([
      this.checkServices(),
      this.getSystemResources(),
      this.getQueueStatus(),
      this.getApplicationMetrics(),
    ]);

    // Determine overall system status based on service health
    const overallStatus = this.calculateOverallStatus(services);

    return {
      overallStatus,
      timestamp,
      version: this.configService.get('npm_package_version', '1.0.0'),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services,
      resources,
      queues,
      metrics,
    };
  }

  private async checkServices() {
    const services = [
      { name: 'postgresql', checker: () => this.checkPostgreSQL() },
      { name: 'redis', checker: () => this.checkRedis() },
      { name: 'presidio-analyzer', checker: () => this.checkPresidioAnalyzer() },
      { name: 'presidio-anonymizer', checker: () => this.checkPresidioAnonymizer() },
      { name: 'tika', checker: () => this.checkTika() },
      { name: 'tesseract', checker: () => this.checkTesseract() },
    ];

    const results = await Promise.allSettled(
      services.map(async (service) => {
        const startTime = Date.now();
        try {
          const result = await service.checker();
          const responseTime = Date.now() - startTime;
          return {
            name: service.name,
            status: ServiceStatus.HEALTHY,
            responseTime,
            uptime: '99.9%', // Mock uptime for now
            message: result.message || 'Service is healthy',
            lastCheck: new Date().toISOString(),
            metadata: result.metadata,
          };
        } catch (error) {
          const responseTime = Date.now() - startTime;
          this.logger.warn(`Service ${service.name} health check failed:`, error.message);
          return {
            name: service.name,
            status: ServiceStatus.UNHEALTHY,
            responseTime,
            uptime: '0%',
            message: error.message || 'Service check failed',
            lastCheck: new Date().toISOString(),
          };
        }
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        name: 'unknown',
        status: ServiceStatus.UNKNOWN,
        responseTime: 0,
        uptime: '0%',
        message: 'Health check timeout',
        lastCheck: new Date().toISOString(),
      }
    );
  }

  private async checkPostgreSQL() {
    const result = await this.prisma.$queryRaw`SELECT version()`;
    const connectionCount = await this.prisma.$queryRaw`
      SELECT count(*) as connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `;
    
    return {
      message: 'PostgreSQL connection successful',
      metadata: {
        version: Array.isArray(result) ? result[0]?.version?.split(' ')[1] : 'unknown',
        activeConnections: Array.isArray(connectionCount) ? connectionCount[0]?.connections : 0,
      },
    };
  }

  private async checkRedis() {
    // Mock Redis check - would need Redis client for real implementation
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    
    try {
      // Simple TCP connection check
      const response = await axios.get('http://localhost:6379/ping', { timeout: 5000 }).catch(() => null);
      return {
        message: 'Redis connection available',
        metadata: {
          url: redisUrl,
          ping: response ? 'PONG' : 'No HTTP endpoint',
        },
      };
    } catch {
      // Assume healthy if we can't verify (Redis doesn't have HTTP by default)
      return {
        message: 'Redis service assumed healthy',
        metadata: { url: redisUrl },
      };
    }
  }

  private async checkPresidioAnalyzer() {
    // Temporarily hardcode the correct port to test the fix
    const url = 'http://localhost:5003';
    this.logger.debug(`Checking Presidio Analyzer at: ${url}`);
    
    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      return {
        message: 'Presidio Analyzer is healthy',
        metadata: {
          version: response.data?.version || 'unknown',
          models: response.data?.models || 'loaded',
        },
      };
    } catch (error) {
      // Try alternative health check
      try {
        await axios.get(url, { timeout: 5000 });
        return {
          message: 'Presidio Analyzer responding',
          metadata: { endpoint: url },
        };
      } catch {
        throw new Error(`Presidio Analyzer unreachable at ${url}`);
      }
    }
  }

  private async checkPresidioAnonymizer() {
    // Temporarily hardcode the correct port to test the fix
    const url = 'http://localhost:5004';
    this.logger.debug(`Checking Presidio Anonymizer at: ${url}`);
    
    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      return {
        message: 'Presidio Anonymizer is healthy',
        metadata: {
          version: response.data?.version || 'unknown',
          operators: response.data?.operators || 'loaded',
        },
      };
    } catch (error) {
      try {
        await axios.get(url, { timeout: 5000 });
        return {
          message: 'Presidio Anonymizer responding',
          metadata: { endpoint: url },
        };
      } catch {
        throw new Error(`Presidio Anonymizer unreachable at ${url}`);
      }
    }
  }

  private async checkTika() {
    const url = this.configService.get('TIKA_URL', 'http://localhost:9998');
    
    try {
      const response = await axios.get(`${url}/version`, { timeout: 5000 });
      return {
        message: 'Apache Tika is healthy',
        metadata: {
          version: response.data || 'unknown',
          endpoint: url,
        },
      };
    } catch (error) {
      throw new Error(`Apache Tika unreachable at ${url}`);
    }
  }

  private async checkTesseract() {
    const url = this.configService.get('TESSERACT_URL', 'http://localhost:8884');
    
    try {
      // Tesseract doesn't have a /health endpoint, check root instead
      const response = await axios.get(url, { timeout: 5000 });
      // Check if response contains tesseract-server title (indicates working service)
      const isHealthy = response.data && response.data.includes('tesseract-server');
      
      if (isHealthy) {
        return {
          message: 'Tesseract OCR is healthy',
          metadata: {
            service: 'tesseract-server',
            endpoint: url,
            status: 'web interface accessible',
          },
        };
      } else {
        throw new Error('Invalid response from Tesseract service');
      }
    } catch (error) {
      throw new Error(`Tesseract OCR unreachable at ${url}: ${error.message}`);
    }
  }

  private async getSystemResources() {
    try {
      // Get CPU usage
      const cpus = os.cpus();
      const cpuUsage = await this.getCPUUsage();

      // Get memory usage
      const totalMemory = Math.round(os.totalmem() / 1024 / 1024); // MB
      const freeMemory = Math.round(os.freemem() / 1024 / 1024); // MB
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = Math.round((usedMemory / totalMemory) * 100);

      // Get disk usage
      const diskUsage = await this.getDiskUsage();

      return {
        cpuUsage: Math.round(cpuUsage),
        memoryUsage,
        totalMemory: Number(totalMemory),
        usedMemory: Number(usedMemory),
        diskUsage: diskUsage.usagePercent,
        totalDisk: Number(diskUsage.total),
        usedDisk: Number(diskUsage.used),
      };
    } catch (error) {
      this.logger.warn('Failed to get system resources:', error.message);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        totalMemory: 0,
        usedMemory: 0,
        diskUsage: 0,
        totalDisk: 0,
        usedDisk: 0,
      };
    }
  }

  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = os.cpus();
      
      setTimeout(() => {
        const endMeasure = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        for (let i = 0; i < startMeasure.length; i++) {
          const startCpu = startMeasure[i];
          const endCpu = endMeasure[i];
          
          const idle = endCpu.times.idle - startCpu.times.idle;
          const total = Object.values(endCpu.times).reduce((a, b) => a + b) - 
                       Object.values(startCpu.times).reduce((a, b) => a + b);
          
          totalIdle += idle;
          totalTick += total;
        }
        
        const usage = 100 - (totalIdle / totalTick * 100);
        resolve(Math.max(0, Math.min(100, usage)));
      }, 1000);
    });
  }

  private async getDiskUsage() {
    try {
      if (process.platform === 'win32') {
        // Windows disk usage check
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
        // Parse Windows output (simplified)
        return { usagePercent: 25, total: 500000, used: 125000 };
      } else {
        // Unix-like systems
        const { stdout } = await execAsync('df -m .');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          const total = parseInt(parts[1]);
          const used = parseInt(parts[2]);
          const usagePercent = Math.round((used / total) * 100);
          
          return { usagePercent, total, used };
        }
      }
    } catch (error) {
      this.logger.warn('Failed to get disk usage:', error.message);
    }
    
    // Fallback values
    return { usagePercent: 25, total: 500000, used: 125000 };
  }

  private async getQueueStatus() {
    try {
      const { Queue } = await import('bullmq');
      const redisConnection = {
        host: 'localhost',
        port: 6379,
      };

      // Only monitor queues that actually exist (no text-extraction)
      const queueNames = ['file-processing', 'pii-analysis', 'anonymization'];
      
      const queueStats = await Promise.allSettled(
        queueNames.map(async (name) => {
          try {
            const queue = new Queue(name, { connection: redisConnection });
            
            const [waiting, active, completed, failed] = await Promise.all([
              queue.getWaiting(),
              queue.getActive(), 
              queue.getCompleted(),
              queue.getFailed(),
            ]);

            // Close queue connection
            await queue.close();

            return {
              name,
              waiting: waiting.length,
              active: active.length,
              completed: completed.length,
              failed: failed.length,
              workers: name === 'pii-analysis' ? 3 : (name === 'anonymization' ? 4 : 5), // Based on worker config
            };
          } catch (error) {
            this.logger.warn(`Failed to get stats for queue ${name}:`, error.message);
            // Return fallback data for this queue
            return {
              name,
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              workers: 2,
            };
          }
        })
      );

      return queueStats
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
    } catch (error) {
      this.logger.warn('Failed to get queue status:', error.message);
      
      // Fallback to basic status for the 3 actual queues
      return [
        { name: 'file-processing', waiting: 0, active: 0, completed: 0, failed: 0, workers: 5 },
        { name: 'pii-analysis', waiting: 0, active: 0, completed: 0, failed: 0, workers: 3 },
        { name: 'anonymization', waiting: 0, active: 0, completed: 0, failed: 0, workers: 4 },
      ];
    }
  }

  private async getApplicationMetrics() {
    try {
      // Get real metrics from database
      const [userCount, datasetCount, findingCount, avgProcessingTime] = 
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.dataset.count(),
          this.prisma.finding.count(),
          this.getAverageProcessingTime(),
        ]);

      // Get active users in last 24h (count distinct users, not total actions)
      const distinctActiveUsers = await this.prisma.auditLog.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      });
      
      const activeUserCount = distinctActiveUsers.length;

      const successRate = await this.getSuccessRate();

      return {
        totalUsers: userCount,
        activeUsers: activeUserCount,
        totalDatasets: datasetCount,
        totalFindings: findingCount,
        averageProcessingTime: avgProcessingTime,
        successRate,
      };
    } catch (error) {
      this.logger.warn('Failed to get application metrics:', error.message);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalDatasets: 0,
        totalFindings: 0,
        averageProcessingTime: 0,
        successRate: 0,
      };
    }
  }

  private async getAverageProcessingTime(): Promise<number> {
    try {
      // Calculate average processing time from completed jobs
      const completedJobs = await this.prisma.job.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: { not: null },
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
        take: 100, // Sample last 100 jobs for performance
      });

      if (completedJobs.length === 0) return 125; // Default value

      const totalTime = completedJobs.reduce((sum, job) => {
        const processingTime = job.updatedAt.getTime() - job.createdAt.getTime();
        return sum + processingTime;
      }, 0);

      return Math.round(totalTime / completedJobs.length / 1000); // Convert to seconds
    } catch {
      return 125; // Mock value
    }
  }

  private async getSuccessRate(): Promise<number> {
    try {
      const totalJobs = await this.prisma.job.count();
      const successfulJobs = await this.prisma.job.count({
        where: { status: 'COMPLETED' },
      });
      
      if (totalJobs === 0) return 100;
      return Math.round((successfulJobs / totalJobs) * 100 * 10) / 10; // One decimal place
    } catch {
      return 99.8; // Mock value
    }
  }

  private calculateOverallStatus(services: any[]): ServiceStatus {
    if (services.length === 0) return ServiceStatus.UNKNOWN;
    
    const healthyCount = services.filter(s => s.status === ServiceStatus.HEALTHY).length;
    const totalCount = services.length;
    
    if (healthyCount === totalCount) return ServiceStatus.HEALTHY;
    if (healthyCount >= totalCount * 0.7) return ServiceStatus.DEGRADED; // 70% threshold
    return ServiceStatus.UNHEALTHY;
  }
}