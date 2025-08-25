import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthService } from '../health.service';
import { PrismaService } from '../../common/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: PrismaService;
  let configService: ConfigService;

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
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset axios mocks
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicHealth', () => {
    it('should return basic health information', async () => {
      // Mock successful database check
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Mock successful external services
      mockedAxios.get.mockResolvedValue({ status: 200 });

      const result = await service.getPublicHealth();

      expect(result).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        services: {
          database: expect.stringMatching(/^(healthy|unhealthy)$/),
          redis: expect.stringMatching(/^(healthy|unhealthy)$/),
          external: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        },
      });
    });

    it('should return proper timestamp format', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockedAxios.get.mockResolvedValue({ status: 200 });

      const result = await service.getPublicHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return positive uptime', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockedAxios.get.mockResolvedValue({ status: 200 });

      const result = await service.getPublicHealth();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isReady', () => {
    it('should return true when critical services are healthy', async () => {
      // Mock successful database and Redis checks
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await service.isReady();

      expect(result).toBe(true);
    });

    it('should return false when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database down'));

      const result = await service.isReady();

      expect(result).toBe(false);
    });

    it('should handle readiness check errors gracefully', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isReady();

      expect(result).toBe(false);
    });
  });

  describe('private methods behavior', () => {
    it('should handle database connectivity check', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await service.getPublicHealth();

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(result.services.database).toBe('healthy');
    });

    it('should handle database connection failure', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getPublicHealth();

      expect(result.services.database).toBe('unhealthy');
    });

    it('should handle external services check', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      
      // Mock external service calls
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 }) // Presidio Analyzer
        .mockResolvedValueOnce({ status: 200 }) // Presidio Anonymizer
        .mockResolvedValueOnce({ status: 200 }); // Tika

      const result = await service.getPublicHealth();

      expect(result.services.external).toBe('healthy');
    });

    it('should handle external service failures', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      
      // Mock external service failures
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await service.getPublicHealth();

      expect(result.services.external).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockPrismaService.$queryRaw.mockImplementation(() => {
        throw new TypeError('Unexpected error');
      });

      const result = await service.getPublicHealth();

      expect(result.services.database).toBe('unhealthy');
    });

    it('should handle axios request errors properly', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      
      mockedAxios.get.mockRejectedValue({
        response: { status: 500, statusText: 'Internal Server Error' }
      });

      const result = await service.getPublicHealth();

      expect(result.services.external).toBe('unhealthy');
    });

    it('should determine overall status correctly', async () => {
      // Test unhealthy state when database is down
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB down'));
      mockedAxios.get.mockResolvedValue({ status: 200 });

      const result = await service.getPublicHealth();

      expect(result.status).toBe('unhealthy');
    });
  });
});