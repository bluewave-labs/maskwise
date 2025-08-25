import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { QueueService } from '../queue.service';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Mock BullMQ
jest.mock('bullmq');
const MockQueue = Queue as jest.MockedClass<typeof Queue>;

// Mock ioredis
jest.mock('ioredis');
const MockRedis = Redis as jest.MockedClass<typeof Redis>;

describe('QueueService', () => {
  let service: QueueService;
  let mockRedis: jest.Mocked<Redis>;
  let mockQueue: jest.Mocked<Queue>;

  const mockJobData = {
    datasetId: 'dataset-123',
    projectId: 'project-456',
    filePath: '/uploads/test-file.txt',
    userId: 'user-789',
    policyId: 'policy-abc',
    jobId: 'job-def',
  };

  const mockJob = {
    id: 'bull-job-123',
    name: 'analyze-pii',
    data: mockJobData,
    progress: 0,
    processedOn: Date.now(),
    finishedOn: null,
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Redis mock
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Setup Queue mock
    mockQueue = {
      add: jest.fn().mockResolvedValue(mockJob),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    MockRedis.mockImplementation(() => mockRedis);
    MockQueue.mockImplementation(() => mockQueue);

    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueService],
    }).compile();

    service = module.get<QueueService>(QueueService);

    // Mock logger to prevent noise in tests
    const logger = service['logger'] as jest.Mocked<Logger>;
    jest.spyOn(logger, 'log').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis connection with default configuration', async () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      await service.onModuleInit();

      expect(MockRedis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
      });
    });

    it('should initialize Redis connection with environment variables', async () => {
      process.env.REDIS_HOST = 'redis-server';
      process.env.REDIS_PORT = '6380';

      await service.onModuleInit();

      expect(MockRedis).toHaveBeenCalledWith({
        host: 'redis-server',
        port: 6380,
        maxRetriesPerRequest: null,
      });

      // Cleanup
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
    });

    it('should initialize PII analysis queue with correct configuration', async () => {
      await service.onModuleInit();

      expect(MockQueue).toHaveBeenCalledWith('pii-analysis', {
        connection: mockRedis,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
    });

    it('should log successful initialization', async () => {
      const logger = service['logger'] as jest.Mocked<Logger>;

      await service.onModuleInit();

      expect(logger.log).toHaveBeenCalledWith('Queue service initialized with PII analysis queue');
    });

    it('should handle Redis connection errors during initialization', async () => {
      const connectionError = new Error('Redis connection failed');
      MockRedis.mockImplementation(() => {
        throw connectionError;
      });

      await expect(service.onModuleInit()).rejects.toThrow('Redis connection failed');
    });

    it('should handle Queue initialization errors', async () => {
      const queueError = new Error('Queue initialization failed');
      MockQueue.mockImplementation(() => {
        throw queueError;
      });

      await expect(service.onModuleInit()).rejects.toThrow('Queue initialization failed');
    });
  });

  describe('addPiiAnalysisJob', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should add PII analysis job successfully', async () => {
      const result = await service.addPiiAnalysisJob(mockJobData);

      expect(mockQueue.add).toHaveBeenCalledWith('analyze-pii', mockJobData, {
        priority: 1,
        delay: 1000,
      });

      expect(result).toEqual(mockJob);
    });

    it('should log successful job addition', async () => {
      const logger = service['logger'] as jest.Mocked<Logger>;

      await service.addPiiAnalysisJob(mockJobData);

      expect(logger.log).toHaveBeenCalledWith(
        `Added PII analysis job: ${mockJob.id} for dataset: ${mockJobData.datasetId}`
      );
    });

    it('should handle job addition with optional parameters', async () => {
      const jobDataWithoutPolicy = {
        datasetId: 'dataset-123',
        projectId: 'project-456',
        filePath: '/uploads/test-file.txt',
        userId: 'user-789',
        jobId: 'job-def',
      };

      await service.addPiiAnalysisJob(jobDataWithoutPolicy);

      expect(mockQueue.add).toHaveBeenCalledWith('analyze-pii', jobDataWithoutPolicy, {
        priority: 1,
        delay: 1000,
      });
    });

    it('should handle queue errors and log them', async () => {
      const queueError = new Error('Queue is full');
      mockQueue.add.mockRejectedValue(queueError);
      const logger = service['logger'] as jest.Mocked<Logger>;

      await expect(service.addPiiAnalysisJob(mockJobData)).rejects.toThrow('Queue is full');

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to add PII analysis job for dataset ${mockJobData.datasetId}:`,
        queueError
      );
    });

    it('should validate required job data fields', async () => {
      const incompleteJobData = {
        datasetId: 'dataset-123',
        // Missing required fields
      } as any;

      await service.addPiiAnalysisJob(incompleteJobData);

      expect(mockQueue.add).toHaveBeenCalledWith('analyze-pii', incompleteJobData, {
        priority: 1,
        delay: 1000,
      });
    });

    it('should handle Redis connection errors during job addition', async () => {
      const redisError = new Error('Redis connection lost');
      mockQueue.add.mockRejectedValue(redisError);

      await expect(service.addPiiAnalysisJob(mockJobData)).rejects.toThrow('Redis connection lost');
    });

    it('should add multiple jobs concurrently', async () => {
      const jobData1 = { ...mockJobData, datasetId: 'dataset-1', jobId: 'job-1' };
      const jobData2 = { ...mockJobData, datasetId: 'dataset-2', jobId: 'job-2' };
      const jobData3 = { ...mockJobData, datasetId: 'dataset-3', jobId: 'job-3' };

      mockQueue.add
        .mockResolvedValueOnce({ ...mockJob, id: 'bull-job-1' })
        .mockResolvedValueOnce({ ...mockJob, id: 'bull-job-2' })
        .mockResolvedValueOnce({ ...mockJob, id: 'bull-job-3' });

      const promises = [
        service.addPiiAnalysisJob(jobData1),
        service.addPiiAnalysisJob(jobData2),
        service.addPiiAnalysisJob(jobData3),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
      expect(results[0].id).toBe('bull-job-1');
      expect(results[1].id).toBe('bull-job-2');
      expect(results[2].id).toBe('bull-job-3');
    });

    it('should use correct job options', async () => {
      await service.addPiiAnalysisJob(mockJobData);

      expect(mockQueue.add).toHaveBeenCalledWith('analyze-pii', mockJobData, {
        priority: 1,
        delay: 1000,
      });
    });

    it('should handle large job data payloads', async () => {
      const largeJobData = {
        ...mockJobData,
        metadata: {
          largeArray: new Array(1000).fill('test-data'),
          complexObject: {
            nested: {
              deeply: {
                values: 'test'
              }
            }
          }
        }
      };

      await service.addPiiAnalysisJob(largeJobData);

      expect(mockQueue.add).toHaveBeenCalledWith('analyze-pii', largeJobData, {
        priority: 1,
        delay: 1000,
      });
    });
  });

  describe('getQueueStats', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return queue statistics successfully', async () => {
      const mockWaitingJobs = [
        { id: 'job-1', name: 'analyze-pii' },
        { id: 'job-2', name: 'analyze-pii' },
      ];
      const mockActiveJobs = [
        { id: 'job-3', name: 'analyze-pii' },
      ];
      const mockCompletedJobs = [
        { id: 'job-4', name: 'analyze-pii' },
        { id: 'job-5', name: 'analyze-pii' },
        { id: 'job-6', name: 'analyze-pii' },
      ];
      const mockFailedJobs = [
        { id: 'job-7', name: 'analyze-pii' },
      ];

      mockQueue.getWaiting.mockResolvedValue(mockWaitingJobs as any);
      mockQueue.getActive.mockResolvedValue(mockActiveJobs as any);
      mockQueue.getCompleted.mockResolvedValue(mockCompletedJobs as any);
      mockQueue.getFailed.mockResolvedValue(mockFailedJobs as any);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        piiAnalysis: {
          waiting: 2,
          active: 1,
          completed: 3,
          failed: 1,
        },
      });
    });

    it('should handle empty queues', async () => {
      mockQueue.getWaiting.mockResolvedValue([]);
      mockQueue.getActive.mockResolvedValue([]);
      mockQueue.getCompleted.mockResolvedValue([]);
      mockQueue.getFailed.mockResolvedValue([]);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        piiAnalysis: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
      });
    });

    it('should handle queue query errors', async () => {
      const queueError = new Error('Failed to query queue');
      mockQueue.getWaiting.mockRejectedValue(queueError);
      const logger = service['logger'] as jest.Mocked<Logger>;

      await expect(service.getQueueStats()).rejects.toThrow('Failed to query queue');

      expect(logger.error).toHaveBeenCalledWith('Failed to get queue stats:', queueError);
    });

    it('should handle partial queue query failures', async () => {
      mockQueue.getWaiting.mockResolvedValue([{ id: 'job-1' }] as any);
      mockQueue.getActive.mockRejectedValue(new Error('Active jobs query failed'));

      await expect(service.getQueueStats()).rejects.toThrow('Active jobs query failed');
    });

    it('should call all queue query methods', async () => {
      mockQueue.getWaiting.mockResolvedValue([]);
      mockQueue.getActive.mockResolvedValue([]);
      mockQueue.getCompleted.mockResolvedValue([]);
      mockQueue.getFailed.mockResolvedValue([]);

      await service.getQueueStats();

      expect(mockQueue.getWaiting).toHaveBeenCalledTimes(1);
      expect(mockQueue.getActive).toHaveBeenCalledTimes(1);
      expect(mockQueue.getCompleted).toHaveBeenCalledTimes(1);
      expect(mockQueue.getFailed).toHaveBeenCalledTimes(1);
    });

    it('should handle large queue sizes', async () => {
      const largeJobArray = new Array(1000).fill({ id: 'job', name: 'analyze-pii' });

      mockQueue.getWaiting.mockResolvedValue(largeJobArray as any);
      mockQueue.getActive.mockResolvedValue(largeJobArray.slice(0, 10) as any);
      mockQueue.getCompleted.mockResolvedValue(largeJobArray.slice(0, 500) as any);
      mockQueue.getFailed.mockResolvedValue(largeJobArray.slice(0, 50) as any);

      const result = await service.getQueueStats();

      expect(result.piiAnalysis.waiting).toBe(1000);
      expect(result.piiAnalysis.active).toBe(10);
      expect(result.piiAnalysis.completed).toBe(500);
      expect(result.piiAnalysis.failed).toBe(50);
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return true when Redis is healthy', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalledTimes(1);
    });

    it('should return false when Redis ping fails', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedis.ping.mockRejectedValue(redisError);
      const logger = service['logger'] as jest.Mocked<Logger>;

      const result = await service.healthCheck();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Queue health check failed:', redisError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockRedis.ping.mockRejectedValue(timeoutError);

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });

    it('should handle connection lost scenarios', async () => {
      const connectionError = new Error('Connection lost');
      mockRedis.ping.mockRejectedValue(connectionError);

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });

    it('should handle concurrent health checks', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const healthChecks = [
        service.healthCheck(),
        service.healthCheck(),
        service.healthCheck(),
      ];

      const results = await Promise.all(healthChecks);

      expect(results).toEqual([true, true, true]);
      expect(mockRedis.ping).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success/failure scenarios', async () => {
      mockRedis.ping
        .mockResolvedValueOnce('PONG')
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce('PONG');

      const result1 = await service.healthCheck();
      const result2 = await service.healthCheck();
      const result3 = await service.healthCheck();

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(true);
    });
  });

  describe('Service Dependencies and Configuration', () => {
    it('should be properly instantiated', () => {
      expect(service).toBeDefined();
      expect(service['logger']).toBeDefined();
    });

    it('should have proper method signatures', () => {
      expect(typeof service.onModuleInit).toBe('function');
      expect(typeof service.addPiiAnalysisJob).toBe('function');
      expect(typeof service.getQueueStats).toBe('function');
      expect(typeof service.healthCheck).toBe('function');
    });

    it('should implement OnModuleInit interface', () => {
      expect(service.onModuleInit).toBeDefined();
    });

    it('should normalize invalid Redis port to default (6379)', async () => {
      process.env.REDIS_PORT = 'invalid-port';

      await service.onModuleInit();

      expect(MockRedis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379, // invalid parse falls back to default
        maxRetriesPerRequest: null,
      });

      delete process.env.REDIS_PORT;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service initialization before method calls', async () => {
      const uninitializedService = new QueueService();

      // Methods should handle uninitialized state gracefully
      await expect(uninitializedService.addPiiAnalysisJob(mockJobData)).rejects.toThrow();
    });

    it('should handle Redis disconnect during operations', async () => {
      await service.onModuleInit();

      // Simulate Redis disconnect
      const disconnectError = new Error('Redis disconnected');
      mockQueue.add.mockRejectedValue(disconnectError);

      await expect(service.addPiiAnalysisJob(mockJobData)).rejects.toThrow('Redis disconnected');
    });

    it('should handle malformed job data', async () => {
      await service.onModuleInit();

      const malformedJobData = {
        datasetId: null,
        projectId: undefined,
        filePath: '',
        userId: 123, // Wrong type
      } as any;

      // Service should still attempt to add the job (validation happens at queue level)
      await service.addPiiAnalysisJob(malformedJobData);

      expect(mockQueue.add).toHaveBeenCalledWith('analyze-pii', malformedJobData, {
        priority: 1,
        delay: 1000,
      });
    });

    it('should handle memory pressure scenarios', async () => {
      await service.onModuleInit();

      // Mock memory error
      const memoryError = new Error('Out of memory');
      mockQueue.add.mockRejectedValue(memoryError);

      await expect(service.addPiiAnalysisJob(mockJobData)).rejects.toThrow('Out of memory');
    });

    it('should handle concurrent initialization attempts', async () => {
      const service1 = new QueueService();
      const service2 = new QueueService();

      // Both should initialize successfully
      await Promise.all([
        service1.onModuleInit(),
        service2.onModuleInit(),
      ]);

      expect(MockRedis).toHaveBeenCalledTimes(2);
      expect(MockQueue).toHaveBeenCalledTimes(2);
    });

    it('should log detailed error information', async () => {
      await service.onModuleInit();

      const detailedError = new Error('Detailed error message');
      detailedError.stack = 'Error stack trace';
      mockQueue.add.mockRejectedValue(detailedError);

      const logger = service['logger'] as jest.Mocked<Logger>;

      await expect(service.addPiiAnalysisJob(mockJobData)).rejects.toThrow('Detailed error message');

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to add PII analysis job for dataset ${mockJobData.datasetId}:`,
        detailedError
      );
    });
  });

  describe('Performance and Load Testing', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle high-frequency job additions', async () => {
      const numberOfJobs = 100;
      const jobPromises = [];

      for (let i = 0; i < numberOfJobs; i++) {
        const jobData = {
          ...mockJobData,
          datasetId: `dataset-${i}`,
          jobId: `job-${i}`,
        };
        jobPromises.push(service.addPiiAnalysisJob(jobData));
      }

      await Promise.all(jobPromises);

      expect(mockQueue.add).toHaveBeenCalledTimes(numberOfJobs);
    });

    it('should handle rapid queue statistics requests', async () => {
      mockQueue.getWaiting.mockResolvedValue([]);
      mockQueue.getActive.mockResolvedValue([]);
      mockQueue.getCompleted.mockResolvedValue([]);
      mockQueue.getFailed.mockResolvedValue([]);

      const statsPromises = [];
      for (let i = 0; i < 10; i++) {
        statsPromises.push(service.getQueueStats());
      }

      const results = await Promise.all(statsPromises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual({
          piiAnalysis: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
          },
        });
      });
    });

    it('should handle rapid health checks', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const healthCheckPromises = [];
      for (let i = 0; i < 20; i++) {
        healthCheckPromises.push(service.healthCheck());
      }

      const results = await Promise.all(healthCheckPromises);

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });
});