import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthMonitorService } from '../services/health-monitor.service';
import { PrismaService } from '../../common/prisma.service';
import { ServiceStatus } from '../dto/system-health-response.dto';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock os module
jest.mock('os', () => ({
  cpus: jest.fn(),
  freemem: jest.fn(),
  totalmem: jest.fn(),
  loadavg: jest.fn(),
}));

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
  },
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('HealthMonitorService', () => {
  let service: HealthMonitorService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    job: {
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthMonitorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthMonitorService>(HealthMonitorService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup default mocks
    mockConfigService.get.mockReturnValue('1.0.0');
    
    // Mock OS functions
    const os = require('os');
    os.cpus.mockReturnValue([{}, {}, {}, {}]); // 4 CPUs
    os.freemem.mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB free
    os.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB total
    os.loadavg.mockReturnValue([1.0, 1.2, 1.1]);

    // Mock fs.promises.stat
    const fs = require('fs');
    fs.promises.stat.mockResolvedValue({
      size: 100 * 1024 * 1024 * 1024, // 100GB used
    });

    // Reset axios mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemHealth', () => {
    it('should return complete system health information', async () => {
      // Mock successful service checks
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('5432')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('6379')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('5001')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('5002')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('9998')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('8884')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        return Promise.reject(new Error('Unknown service'));
      });

      // Mock database query
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Mock job counts
      mockPrismaService.job.count.mockResolvedValue(100);

      const result = await service.getSystemHealth();

      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('queues');
      expect(result).toHaveProperty('metrics');

      expect(result.overallStatus).toBe(ServiceStatus.HEALTHY);
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(result.version).toBe('1.0.0');
    });

    it('should check all required services', async () => {
      // Mock successful responses for all services
      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(50);

      const result = await service.getSystemHealth();

      expect(result.services).toHaveLength(6);
      
      const serviceNames = result.services.map(s => s.name);
      expect(serviceNames).toContain('postgresql');
      expect(serviceNames).toContain('redis');
      expect(serviceNames).toContain('presidio-analyzer');
      expect(serviceNames).toContain('presidio-anonymizer');
      expect(serviceNames).toContain('tika');
      expect(serviceNames).toContain('tesseract');
    });

    it('should handle service failures gracefully', async () => {
      // Mock some services failing
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('postgresql')) return Promise.reject(new Error('Database connection failed'));
        if (url.includes('redis')) return Promise.reject(new Error('Redis unavailable'));
        return Promise.resolve({ status: 200, data: { status: 'ok' } });
      });

      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database down'));
      mockPrismaService.job.count.mockResolvedValue(25);

      const result = await service.getSystemHealth();

      expect(result.overallStatus).toBe(ServiceStatus.DEGRADED);
      
      const failedServices = result.services.filter(s => s.status === ServiceStatus.UNHEALTHY);
      expect(failedServices.length).toBeGreaterThan(0);

      const postgresService = result.services.find(s => s.name === 'postgresql');
      expect(postgresService?.status).toBe(ServiceStatus.UNHEALTHY);
      expect(postgresService?.message).toContain('Database');
    });

    it('should calculate overall status correctly', async () => {
      // Test all services healthy
      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(75);

      let result = await service.getSystemHealth();
      expect(result.overallStatus).toBe(ServiceStatus.HEALTHY);

      // Test some services failing (should be DEGRADED)
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('presidio-analyzer')) return Promise.reject(new Error('Service down'));
        return Promise.resolve({ status: 200, data: { status: 'ok' } });
      });

      result = await service.getSystemHealth();
      expect(result.overallStatus).toBe(ServiceStatus.DEGRADED);

      // Test critical services failing (should be UNHEALTHY)
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('postgresql')) return Promise.reject(new Error('Database down'));
        if (url.includes('redis')) return Promise.reject(new Error('Cache down'));
        return Promise.resolve({ status: 200, data: { status: 'ok' } });
      });
      
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      result = await service.getSystemHealth();
      expect(result.overallStatus).toBe(ServiceStatus.UNHEALTHY);
    });

    it('should collect system resource information', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(30);

      const result = await service.getSystemHealth();

      expect(result.resources).toHaveProperty('cpu');
      expect(result.resources).toHaveProperty('memory');
      expect(result.resources).toHaveProperty('disk');

      // CPU resources
      expect(result.resources.cpu).toHaveProperty('usage');
      expect(result.resources.cpu).toHaveProperty('cores');
      expect(result.resources.cpu).toHaveProperty('loadAverage');
      expect(result.resources.cpu.cores).toBe(4);
      expect(Array.isArray(result.resources.cpu.loadAverage)).toBe(true);

      // Memory resources
      expect(result.resources.memory).toHaveProperty('used');
      expect(result.resources.memory).toHaveProperty('free');
      expect(result.resources.memory).toHaveProperty('total');
      expect(result.resources.memory).toHaveProperty('percentage');
      expect(result.resources.memory.total).toBe(8192); // 8GB in MB

      // Disk resources
      expect(result.resources.disk).toHaveProperty('used');
      expect(result.resources.disk).toHaveProperty('free');
      expect(result.resources.disk).toHaveProperty('total');
      expect(result.resources.disk).toHaveProperty('percentage');
    });

    it('should collect queue status information', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      
      // Mock job counts for different statuses
      mockPrismaService.job.count
        .mockResolvedValueOnce(5)   // waiting
        .mockResolvedValueOnce(2)   // active
        .mockResolvedValueOnce(100) // completed
        .mockResolvedValueOnce(3)   // failed
        .mockResolvedValueOnce(0);  // delayed

      const result = await service.getSystemHealth();

      expect(result.queues).toHaveProperty('pii-analysis');
      
      const queueInfo = result.queues['pii-analysis'];
      expect(queueInfo).toHaveProperty('waiting');
      expect(queueInfo).toHaveProperty('active');
      expect(queueInfo).toHaveProperty('completed');
      expect(queueInfo).toHaveProperty('failed');
      expect(queueInfo).toHaveProperty('delayed');
      expect(queueInfo).toHaveProperty('paused');

      expect(queueInfo.waiting).toBe(5);
      expect(queueInfo.active).toBe(2);
      expect(queueInfo.completed).toBe(100);
      expect(queueInfo.failed).toBe(3);
      expect(queueInfo.delayed).toBe(0);
    });

    it('should collect application metrics', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      
      // Mock metrics queries
      mockPrismaService.job.count
        .mockResolvedValueOnce(200)  // total jobs
        .mockResolvedValueOnce(185)  // successful jobs
        .mockResolvedValueOnce(15)   // failed jobs
        .mockResolvedValueOnce(50)   // recent jobs for RPM calculation
        .mockResolvedValueOnce(5)    // active
        .mockResolvedValueOnce(2)    // completed
        .mockResolvedValueOnce(100)  // historical completed
        .mockResolvedValueOnce(3)    // historical failed
        .mockResolvedValueOnce(0);   // delayed

      const result = await service.getSystemHealth();

      expect(result.metrics).toHaveProperty('totalJobs');
      expect(result.metrics).toHaveProperty('successfulJobs');
      expect(result.metrics).toHaveProperty('failedJobs');
      expect(result.metrics).toHaveProperty('averageProcessingTime');
      expect(result.metrics).toHaveProperty('requestsPerMinute');
      expect(result.metrics).toHaveProperty('errorRate');
      expect(result.metrics).toHaveProperty('responseTime');

      expect(typeof result.metrics.totalJobs).toBe('number');
      expect(typeof result.metrics.successfulJobs).toBe('number');
      expect(typeof result.metrics.failedJobs).toBe('number');
      expect(typeof result.metrics.errorRate).toBe('number');
    });

    it('should handle service timeouts', async () => {
      // Mock timeout for some services
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('presidio-analyzer')) {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100);
          });
        }
        return Promise.resolve({ status: 200, data: { status: 'ok' } });
      });

      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(40);

      const result = await service.getSystemHealth();

      const analyzerService = result.services.find(s => s.name === 'presidio-analyzer');
      expect(analyzerService?.status).toBe(ServiceStatus.UNHEALTHY);
      expect(analyzerService?.message).toContain('timeout');
    });

    it('should handle database connection errors', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      mockPrismaService.job.count.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getSystemHealth();

      const postgresService = result.services.find(s => s.name === 'postgresql');
      expect(postgresService?.status).toBe(ServiceStatus.UNHEALTHY);
      expect(postgresService?.message).toContain('Connection failed');
    });

    it('should measure response times accurately', async () => {
      // Mock delayed responses
      mockedAxios.get.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ status: 200, data: { status: 'ok' } });
          }, 50); // 50ms delay
        });
      });

      mockPrismaService.$queryRaw.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve([{ result: 1 }]);
          }, 30); // 30ms delay
        });
      });

      mockPrismaService.job.count.mockResolvedValue(60);

      const result = await service.getSystemHealth();

      result.services.forEach(service => {
        expect(service.responseTime).toBeGreaterThan(0);
        expect(typeof service.responseTime).toBe('number');
      });
    });

    it('should handle partial service failures', async () => {
      // Mock mixed success/failure responses
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('postgresql')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('redis')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('presidio-analyzer')) return Promise.reject(new Error('Service unavailable'));
        if (url.includes('presidio-anonymizer')) return Promise.reject(new Error('Service unavailable'));
        if (url.includes('tika')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        if (url.includes('tesseract')) return Promise.resolve({ status: 200, data: { status: 'ok' } });
        return Promise.reject(new Error('Unknown service'));
      });

      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(80);

      const result = await service.getSystemHealth();

      const healthyServices = result.services.filter(s => s.status === ServiceStatus.HEALTHY);
      const unhealthyServices = result.services.filter(s => s.status === ServiceStatus.UNHEALTHY);

      expect(healthyServices).toHaveLength(4); // postgresql, redis, tika, tesseract
      expect(unhealthyServices).toHaveLength(2); // presidio services

      expect(result.overallStatus).toBe(ServiceStatus.DEGRADED);
    });

    it('should handle configuration service errors', async () => {
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'npm_package_version') throw new Error('Config unavailable');
        return undefined;
      });

      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(90);

      const result = await service.getSystemHealth();

      // Should still work with fallback version
      expect(result.version).toBe('1.0.0');
    });

    it('should calculate uptime correctly', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(70);

      const result = await service.getSystemHealth();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should handle resource monitoring errors', async () => {
      // Mock OS functions to throw errors
      const os = require('os');
      os.cpus.mockImplementation(() => { throw new Error('CPU info unavailable'); });
      os.freemem.mockImplementation(() => { throw new Error('Memory info unavailable'); });

      mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(45);

      const result = await service.getSystemHealth();

      // Should still return health data even with resource monitoring errors
      expect(result).toHaveProperty('resources');
      expect(result.resources).toHaveProperty('cpu');
      expect(result.resources).toHaveProperty('memory');
    });
  });

  describe('Service Dependencies and Initialization', () => {
    it('should be properly instantiated with dependencies', () => {
      expect(service).toBeDefined();
      expect(service['prisma']).toBeDefined();
      expect(service['configService']).toBeDefined();
      expect(service['logger']).toBeDefined();
    });

    it('should have proper method signatures', () => {
      expect(typeof service.getSystemHealth).toBe('function');
    });

    it('should record start time for uptime calculation', () => {
      expect(service['startTime']).toBeDefined();
      expect(typeof service['startTime']).toBe('number');
      expect(service['startTime']).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue operating when non-critical services fail', async () => {
      // Mock all external services failing
      mockedAxios.get.mockRejectedValue(new Error('All external services down'));
      
      // But database still works
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.job.count.mockResolvedValue(35);

      const result = await service.getSystemHealth();

      // Should still return valid health data
      expect(result).toBeDefined();
      expect(result.overallStatus).toBe(ServiceStatus.DEGRADED);
      expect(result.services).toHaveLength(6); // All services checked, even if failed

      // Database service should be healthy
      const dbService = result.services.find(s => s.name === 'postgresql');
      expect(dbService?.status).toBe(ServiceStatus.HEALTHY);
    });

    it('should provide meaningful error messages for debugging', async () => {
      const specificErrors = [
        { service: 'postgresql', error: 'Connection refused on port 5432' },
        { service: 'redis', error: 'Authentication failed' },
        { service: 'presidio-analyzer', error: 'Service not responding' },
      ];

      mockedAxios.get.mockImplementation((url) => {
        const error = specificErrors.find(e => url.includes(e.service));
        if (error) return Promise.reject(new Error(error.error));
        return Promise.resolve({ status: 200, data: { status: 'ok' } });
      });

      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused on port 5432'));
      mockPrismaService.job.count.mockResolvedValue(25);

      const result = await service.getSystemHealth();

      specificErrors.forEach(({ service, error }) => {
        const serviceHealth = result.services.find(s => s.name === service);
        expect(serviceHealth?.message).toContain(error);
      });
    });
  });
});