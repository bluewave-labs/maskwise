import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';
import { PrismaService } from '../../common/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthService = {
    getPublicHealth: jest.fn(),
    isReady: jest.fn(),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return public health status', async () => {
      const expectedResult = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'healthy' as const,
          redis: 'healthy' as const,
          external: 'healthy' as const,
        },
      };

      mockHealthService.getPublicHealth.mockResolvedValue(expectedResult);

      const result = await controller.getHealth();

      expect(healthService.getPublicHealth).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors gracefully', async () => {
      mockHealthService.getPublicHealth.mockRejectedValue(
        new Error('Health check failed')
      );

      await expect(controller.getHealth()).rejects.toThrow('Health check failed');
      expect(healthService.getPublicHealth).toHaveBeenCalled();
    });

    it('should return degraded status when some services are unhealthy', async () => {
      const expectedResult = {
        status: 'degraded' as const,
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'healthy' as const,
          redis: 'healthy' as const,
          external: 'degraded' as const,
        },
      };

      mockHealthService.getPublicHealth.mockResolvedValue(expectedResult);

      const result = await controller.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.external).toBe('degraded');
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when services are ready', async () => {
      mockHealthService.isReady.mockResolvedValue(true);

      const result = await controller.getReadiness();

      expect(healthService.isReady).toHaveBeenCalled();
      expect(result.status).toBe('ready');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw error when not ready', async () => {
      mockHealthService.isReady.mockResolvedValue(false);

      await expect(controller.getReadiness()).rejects.toThrow('Application is not ready');
      expect(healthService.isReady).toHaveBeenCalled();
    });

    it('should handle readiness check failures', async () => {
      mockHealthService.isReady.mockRejectedValue(
        new Error('Readiness check failed')
      );

      await expect(controller.getReadiness()).rejects.toThrow('Readiness check failed');
    });
  });

  describe('getLiveness', () => {
    it('should return alive status', async () => {
      const result = await controller.getLiveness();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
    });

    it('should always return alive (no dependencies)', async () => {
      // Liveness should not depend on external services
      const result = await controller.getLiveness();

      expect(result.status).toBe('alive');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete health monitoring workflow', async () => {
      const publicHealth = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'healthy' as const,
          redis: 'healthy' as const,
          external: 'healthy' as const,
        },
      };

      mockHealthService.getPublicHealth.mockResolvedValue(publicHealth);
      mockHealthService.isReady.mockResolvedValue(true);

      // Execute complete workflow
      const publicResult = await controller.getHealth();
      const readinessResult = await controller.getReadiness();
      const livenessResult = await controller.getLiveness();

      expect(publicResult.status).toBe('healthy');
      expect(readinessResult.status).toBe('ready');
      expect(livenessResult.status).toBe('alive');
    });

    it('should handle unhealthy system state properly', async () => {
      const unhealthyHealth = {
        status: 'unhealthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'unhealthy' as const,
          redis: 'healthy' as const,
          external: 'healthy' as const,
        },
      };

      mockHealthService.getPublicHealth.mockResolvedValue(unhealthyHealth);
      mockHealthService.isReady.mockResolvedValue(false);

      const publicResult = await controller.getHealth();
      
      expect(publicResult.status).toBe('unhealthy');
      expect(publicResult.services.database).toBe('unhealthy');
      
      await expect(controller.getReadiness()).rejects.toThrow();
    });
  });
});