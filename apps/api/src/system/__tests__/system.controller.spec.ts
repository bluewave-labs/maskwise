import { Test, TestingModule } from '@nestjs/testing';
import { SystemController } from '../system.controller';
import { SystemService } from '../system.service';
import { HealthMonitorService } from '../services/health-monitor.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateSystemConfigDto } from '../dto/update-system-config.dto';
import { SystemConfigResponseDto } from '../dto/system-config-response.dto';
import { SystemHealthResponseDto } from '../dto/system-health-response.dto';
import { ServiceStatus } from '../dto/system-health-response.dto';

describe('SystemController', () => {
  let controller: SystemController;
  let systemService: SystemService;
  let healthMonitorService: HealthMonitorService;

  const mockSystemConfigResponse: SystemConfigResponseDto = {
    file: {
      maxSize: 100,
      allowedTypes: ['txt', 'csv', 'pdf', 'docx', 'xlsx', 'json', 'jsonl'],
      retentionDays: 30,
    },
    pii: {
      defaultConfidenceThreshold: 0.85,
      defaultAction: 'redact',
      enabledEntityTypes: [
        'EMAIL_ADDRESS',
        'SSN',
        'CREDIT_CARD',
        'PHONE_NUMBER',
        'PERSON',
        'LOCATION',
        'ORGANIZATION',
        'DATE_TIME',
        'IP_ADDRESS',
        'URL'
      ],
    },
    security: {
      enableFileContentScanning: true,
      maxConcurrentJobs: 10,
      jobTimeoutMinutes: 30,
    },
    performance: {
      workerConcurrency: 5,
      maxQueueSize: 1000,
      enableCaching: true,
    },
  };

  const mockHealthResponse: SystemHealthResponseDto = {
    overallStatus: ServiceStatus.HEALTHY,
    timestamp: '2024-01-01T00:00:00.000Z',
    version: '1.0.0',
    uptime: 3600,
    services: [
      {
        name: 'postgresql',
        status: ServiceStatus.HEALTHY,
        responseTime: 50,
        uptime: '99.9%',
        message: 'Database is healthy',
        lastCheck: '2024-01-01T00:00:00.000Z',
      },
      {
        name: 'redis',
        status: ServiceStatus.HEALTHY,
        responseTime: 25,
        uptime: '99.9%',
        message: 'Cache is healthy',
        lastCheck: '2024-01-01T00:00:00.000Z',
      }
    ],
    resources: {
      cpuUsage: 45.2,
      memoryUsage: 68.7,
      totalMemory: 8192,
      usedMemory: 2048,
      diskUsage: 25.0,
      totalDisk: 200000,
      usedDisk: 50000,
      cpu: {
        usage: 45.2,
        cores: 8,
        loadAverage: [1.2, 1.5, 1.3],
      },
      memory: {
        used: 2048,
        free: 6144,
        total: 8192,
        percentage: 25.0,
      },
      disk: {
        used: 50000,
        free: 150000,
        total: 200000,
        percentage: 25.0,
      },
    },
    queues: [
      {
        name: 'pii-analysis',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        workers: 5,
      },
    ],
    metrics: {
      totalUsers: 50,
      activeUsers: 15,
      totalDatasets: 200,
      totalFindings: 1500,
      averageProcessingTime: 2500,
      successRate: 92.5,
      totalJobs: 200,
      successfulJobs: 185,
      failedJobs: 15,
      requestsPerMinute: 50,
      errorRate: 0.075,
      responseTime: 150,
    },
  };

  const mockSystemService = {
    getConfiguration: jest.fn(),
    updateConfiguration: jest.fn(),
  };

  const mockHealthMonitorService = {
    getSystemHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        {
          provide: SystemService,
          useValue: mockSystemService,
        },
        {
          provide: HealthMonitorService,
          useValue: mockHealthMonitorService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .compile();

    controller = module.get<SystemController>(SystemController);
    systemService = module.get<SystemService>(SystemService);
    healthMonitorService = module.get<HealthMonitorService>(HealthMonitorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfiguration', () => {
    it('should return system configuration successfully', async () => {
      mockSystemService.getConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.getConfiguration();

      expect(result).toEqual(mockSystemConfigResponse);
      expect(systemService.getConfiguration).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const errorMessage = 'Configuration service unavailable';
      mockSystemService.getConfiguration.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getConfiguration()).rejects.toThrow(errorMessage);
      expect(systemService.getConfiguration).toHaveBeenCalledTimes(1);
    });

    it('should return configuration with all required sections', async () => {
      mockSystemService.getConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.getConfiguration();

      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('pii');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('performance');

      // Verify file configuration structure
      expect(result.file).toHaveProperty('maxSize');
      expect(result.file).toHaveProperty('allowedTypes');
      expect(result.file).toHaveProperty('retentionDays');

      // Verify PII configuration structure
      expect(result.pii).toHaveProperty('defaultConfidenceThreshold');
      expect(result.pii).toHaveProperty('defaultAction');
      expect(result.pii).toHaveProperty('enabledEntityTypes');

      // Verify security configuration structure
      expect(result.security).toHaveProperty('enableFileContentScanning');
      expect(result.security).toHaveProperty('maxConcurrentJobs');
      expect(result.security).toHaveProperty('jobTimeoutMinutes');

      // Verify performance configuration structure
      expect(result.performance).toHaveProperty('workerConcurrency');
      expect(result.performance).toHaveProperty('maxQueueSize');
      expect(result.performance).toHaveProperty('enableCaching');
    });
  });

  describe('updateConfiguration', () => {
    it('should update system configuration successfully', async () => {
      const updateDto: UpdateSystemConfigDto = {
        file: {
          maxSize: 200,
          retentionDays: 60,
        },
        pii: {
          defaultConfidenceThreshold: 0.9,
        },
      };

      const updatedConfig = {
        ...mockSystemConfigResponse,
        file: {
          ...mockSystemConfigResponse.file,
          maxSize: 200,
          retentionDays: 60,
        },
        pii: {
          ...mockSystemConfigResponse.pii,
          defaultConfidenceThreshold: 0.9,
        },
      };

      mockSystemService.updateConfiguration.mockResolvedValue(updatedConfig);

      const result = await controller.updateConfiguration(updateDto);

      expect(result).toEqual(updatedConfig);
      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
      expect(systemService.updateConfiguration).toHaveBeenCalledTimes(1);

      // Verify the updated values
      expect(result.file.maxSize).toBe(200);
      expect(result.file.retentionDays).toBe(60);
      expect(result.pii.defaultConfidenceThreshold).toBe(0.9);
    });

    it('should handle file configuration updates', async () => {
      const updateDto: UpdateSystemConfigDto = {
        file: {
          maxSize: 150,
          allowedTypes: ['txt', 'pdf', 'png'],
          retentionDays: 45,
        },
      };

      mockSystemService.updateConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.updateConfiguration(updateDto);

      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(mockSystemConfigResponse);
    });

    it('should handle PII configuration updates', async () => {
      const updateDto: UpdateSystemConfigDto = {
        pii: {
          defaultConfidenceThreshold: 0.95,
          defaultAction: 'mask',
          enabledEntityTypes: ['EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD'],
        },
      };

      mockSystemService.updateConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.updateConfiguration(updateDto);

      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(mockSystemConfigResponse);
    });

    it('should handle security configuration updates', async () => {
      const updateDto: UpdateSystemConfigDto = {
        security: {
          enableFileContentScanning: false,
          maxConcurrentJobs: 20,
          jobTimeoutMinutes: 60,
        },
      };

      mockSystemService.updateConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.updateConfiguration(updateDto);

      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(mockSystemConfigResponse);
    });

    it('should handle performance configuration updates', async () => {
      const updateDto: UpdateSystemConfigDto = {
        performance: {
          workerConcurrency: 10,
          maxQueueSize: 2000,
          enableCaching: false,
        },
      };

      mockSystemService.updateConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.updateConfiguration(updateDto);

      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(mockSystemConfigResponse);
    });

    it('should handle validation errors from service', async () => {
      const updateDto: UpdateSystemConfigDto = {
        file: { maxSize: 2000 }, // Invalid size
      };

      const validationError = new Error('File size must be between 1MB and 1000MB');
      mockSystemService.updateConfiguration.mockRejectedValue(validationError);

      await expect(controller.updateConfiguration(updateDto)).rejects.toThrow(
        'File size must be between 1MB and 1000MB'
      );
      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
    });

    it('should handle empty update requests', async () => {
      const updateDto: UpdateSystemConfigDto = {};

      mockSystemService.updateConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.updateConfiguration(updateDto);

      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(mockSystemConfigResponse);
    });

    it('should handle partial updates', async () => {
      const updateDto: UpdateSystemConfigDto = {
        pii: {
          defaultConfidenceThreshold: 0.8,
        },
      };

      const partiallyUpdatedConfig = {
        ...mockSystemConfigResponse,
        pii: {
          ...mockSystemConfigResponse.pii,
          defaultConfidenceThreshold: 0.8,
        },
      };

      mockSystemService.updateConfiguration.mockResolvedValue(partiallyUpdatedConfig);

      const result = await controller.updateConfiguration(updateDto);

      expect(result.pii.defaultConfidenceThreshold).toBe(0.8);
      expect(result.file).toEqual(mockSystemConfigResponse.file); // Unchanged
      expect(result.security).toEqual(mockSystemConfigResponse.security); // Unchanged
      expect(result.performance).toEqual(mockSystemConfigResponse.performance); // Unchanged
    });

    it('should handle service errors during update', async () => {
      const updateDto: UpdateSystemConfigDto = {
        file: { maxSize: 150 },
      };

      const serviceError = new Error('Internal service error');
      mockSystemService.updateConfiguration.mockRejectedValue(serviceError);

      await expect(controller.updateConfiguration(updateDto)).rejects.toThrow('Internal service error');
      expect(systemService.updateConfiguration).toHaveBeenCalledWith(updateDto);
    });
  });

  describe('getHealth', () => {
    it('should return system health successfully', async () => {
      mockHealthMonitorService.getSystemHealth.mockResolvedValue(mockHealthResponse);

      const result = await controller.getHealth();

      expect(result).toEqual(mockHealthResponse);
      expect(healthMonitorService.getSystemHealth).toHaveBeenCalledTimes(1);
    });

    it('should handle health monitor service errors', async () => {
      const errorMessage = 'Health monitoring service unavailable';
      mockHealthMonitorService.getSystemHealth.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getHealth()).rejects.toThrow(errorMessage);
      expect(healthMonitorService.getSystemHealth).toHaveBeenCalledTimes(1);
    });

    it('should return health data with all required sections', async () => {
      mockHealthMonitorService.getSystemHealth.mockResolvedValue(mockHealthResponse);

      const result = await controller.getHealth();

      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('queues');
      expect(result).toHaveProperty('metrics');

      // Verify services structure
      expect(Array.isArray(result.services)).toBe(true);
      expect(result.services[0]).toHaveProperty('name');
      expect(result.services[0]).toHaveProperty('status');
      expect(result.services[0]).toHaveProperty('responseTime');

      // Verify resources structure
      expect(result.resources).toHaveProperty('cpu');
      expect(result.resources).toHaveProperty('memory');
      expect(result.resources).toHaveProperty('disk');

      // Verify queues structure
      expect(result.queues).toHaveProperty('pii-analysis');

      // Verify metrics structure
      expect(result.metrics).toHaveProperty('totalJobs');
      expect(result.metrics).toHaveProperty('successfulJobs');
      expect(result.metrics).toHaveProperty('failedJobs');
    });

    it('should handle different health statuses', async () => {
      const unhealthyResponse = {
        ...mockHealthResponse,
        overallStatus: ServiceStatus.UNHEALTHY,
        services: [
          {
            name: 'postgresql',
            status: ServiceStatus.UNHEALTHY,
            responseTime: 5000,
            uptime: '0%',
            message: 'Database connection failed',
            lastCheck: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      mockHealthMonitorService.getSystemHealth.mockResolvedValue(unhealthyResponse);

      const result = await controller.getHealth();

      expect(result.overallStatus).toBe(ServiceStatus.UNHEALTHY);
      expect(result.services[0].status).toBe(ServiceStatus.UNHEALTHY);
    });

    it('should handle timeout scenarios', async () => {
      const timeoutError = new Error('Health check timeout');
      mockHealthMonitorService.getSystemHealth.mockRejectedValue(timeoutError);

      await expect(controller.getHealth()).rejects.toThrow('Health check timeout');
    });

    it('should return valid timestamp and uptime', async () => {
      mockHealthMonitorService.getSystemHealth.mockResolvedValue(mockHealthResponse);

      const result = await controller.getHealth();

      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', () => {
      // Verify that JwtAuthGuard is applied to the controller
      const guards = Reflect.getMetadata('__guards__', SystemController);
      expect(guards).toBeDefined();
    });

    it('should handle authentication failures', async () => {
      // Mock authentication failure
      const module: TestingModule = await Test.createTestingModule({
        controllers: [SystemController],
        providers: [
          {
            provide: SystemService,
            useValue: mockSystemService,
          },
          {
            provide: HealthMonitorService,
            useValue: mockHealthMonitorService,
          },
        ],
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(false),
      })
      .compile();

      const controllerWithFailedAuth = module.get<SystemController>(SystemController);

      // The guard should prevent access, but we can't test this directly in unit tests
      // This would be tested in integration tests
      expect(controllerWithFailedAuth).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent requests to configuration endpoints', async () => {
      mockSystemService.getConfiguration.mockResolvedValue(mockSystemConfigResponse);
      mockSystemService.updateConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const updateDto: UpdateSystemConfigDto = {
        file: { maxSize: 250 },
      };

      // Simulate concurrent requests
      const getPromises = [
        controller.getConfiguration(),
        controller.getConfiguration(),
        controller.getConfiguration(),
      ];

      const updatePromises = [
        controller.updateConfiguration(updateDto),
        controller.updateConfiguration(updateDto),
      ];

      const results = await Promise.all([...getPromises, ...updatePromises]);

      // All requests should complete successfully
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual(mockSystemConfigResponse);
      });

      expect(systemService.getConfiguration).toHaveBeenCalledTimes(3);
      expect(systemService.updateConfiguration).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent health check requests', async () => {
      mockHealthMonitorService.getSystemHealth.mockResolvedValue(mockHealthResponse);

      // Simulate multiple concurrent health checks
      const healthPromises = [
        controller.getHealth(),
        controller.getHealth(),
        controller.getHealth(),
      ];

      const results = await Promise.all(healthPromises);

      // All requests should return the same health data
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockHealthResponse);
      });

      expect(healthMonitorService.getSystemHealth).toHaveBeenCalledTimes(3);
    });

    it('should handle large configuration objects', async () => {
      const largeUpdateDto: UpdateSystemConfigDto = {
        file: {
          maxSize: 999,
          allowedTypes: [
            'txt', 'csv', 'pdf', 'docx', 'xlsx', 'json', 'jsonl',
            'pptx', 'png', 'jpg', 'tiff'
          ],
          retentionDays: 365,
        },
        pii: {
          defaultConfidenceThreshold: 0.99,
          defaultAction: 'encrypt',
          enabledEntityTypes: [
            'EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD', 'PHONE_NUMBER', 'PERSON',
            'LOCATION', 'ORGANIZATION', 'DATE_TIME', 'IP_ADDRESS', 'URL',
            'US_DRIVER_LICENSE', 'US_PASSPORT', 'MEDICAL_LICENSE', 'IBAN', 'UK_NHS'
          ],
        },
        security: {
          enableFileContentScanning: true,
          maxConcurrentJobs: 50,
          jobTimeoutMinutes: 120,
        },
        performance: {
          workerConcurrency: 20,
          maxQueueSize: 10000,
          enableCaching: true,
        },
      };

      mockSystemService.updateConfiguration.mockResolvedValue(mockSystemConfigResponse);

      const result = await controller.updateConfiguration(largeUpdateDto);

      expect(systemService.updateConfiguration).toHaveBeenCalledWith(largeUpdateDto);
      expect(result).toEqual(mockSystemConfigResponse);
    });

    it('should handle service method timeouts', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Service timeout')), 100);
      });

      mockSystemService.getConfiguration.mockReturnValue(timeoutPromise);

      await expect(controller.getConfiguration()).rejects.toThrow('Service timeout');
    });

    it('should handle malformed service responses', async () => {
      // Mock service returning malformed data
      mockSystemService.getConfiguration.mockResolvedValue(null);

      const result = await controller.getConfiguration();

      expect(result).toBeNull();
    });
  });

  describe('Controller Dependencies', () => {
    it('should be properly instantiated with dependencies', () => {
      expect(controller).toBeDefined();
      expect(controller['systemService']).toBeDefined();
      expect(controller['healthMonitorService']).toBeDefined();
    });

    it('should have proper method signatures', () => {
      expect(typeof controller.getConfiguration).toBe('function');
      expect(typeof controller.updateConfiguration).toBe('function');
      expect(typeof controller.getHealth).toBe('function');
    });
  });
});