import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JobsService } from '../jobs.service';
import { PrismaService } from '../../common/prisma.service';

// Mock PrismaService
const mockPrismaService = {
  job: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  dataset: {
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

describe('JobsService', () => {
  let service: JobsService;
  let prisma: typeof mockPrismaService;

  const mockUserId = 'user-123';
  const mockJobId = 'job-123';
  const mockDatasetId = 'dataset-123';
  const mockPolicyId = 'policy-123';

  const mockJob = {
    id: mockJobId,
    type: 'ANALYZE_PII',
    status: 'QUEUED',
    priority: 1,
    startedAt: null,
    endedAt: null,
    error: null,
    progress: 0,
    metadata: { source: 'test' },
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
    datasetId: mockDatasetId,
    createdById: mockUserId,
    policyId: mockPolicyId,
    dataset: {
      id: mockDatasetId,
      name: 'Test Dataset',
      filename: 'test.txt',
      fileType: 'TXT',
      fileSize: BigInt(1024),
      status: 'PENDING',
      project: {
        id: 'project-123',
        name: 'Test Project',
      },
    },
    createdBy: {
      id: mockUserId,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
    policy: {
      id: mockPolicyId,
      name: 'Test Policy',
      version: '1.0.0',
      config: { entities: [] },
    },
  };

  const mockJobList = [
    {
      ...mockJob,
      id: 'job-1',
      dataset: { id: mockDatasetId, name: 'Dataset 1', filename: 'file1.txt' },
      createdBy: { id: mockUserId, email: 'user@test.com', firstName: 'John', lastName: 'Doe' },
      policy: { id: mockPolicyId, name: 'Policy 1' },
    },
    {
      ...mockJob,
      id: 'job-2',
      type: 'EXTRACT_TEXT',
      status: 'COMPLETED',
      dataset: { id: 'dataset-2', name: 'Dataset 2', filename: 'file2.pdf' },
      createdBy: { id: mockUserId, email: 'user@test.com', firstName: 'John', lastName: 'Doe' },
      policy: { id: mockPolicyId, name: 'Policy 2' },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prisma = module.get(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return jobs with pagination', async () => {
      const filters = {
        page: 1,
        limit: 10,
        status: 'QUEUED',
        type: 'ANALYZE_PII',
        datasetId: mockDatasetId,
      };

      prisma.job.findMany.mockResolvedValue(mockJobList);
      prisma.job.count.mockResolvedValue(2);

      const result = await service.findAll(mockUserId, filters);

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'job-1',
            metadata: { source: 'test' },
          }),
        ]),
        total: 2,
        page: 1,
        pages: 1,
      });

      expect(prisma.job.findMany).toHaveBeenCalledWith({
        where: {
          dataset: {
            project: {
              userId: mockUserId,
            },
          },
          status: 'QUEUED',
          type: 'ANALYZE_PII',
          datasetId: mockDatasetId,
        },
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          dataset: {
            select: {
              id: true,
              name: true,
              filename: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          policy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should handle pagination correctly', async () => {
      const filters = { page: 2, limit: 5 };
      prisma.job.findMany.mockResolvedValue([]);
      prisma.job.count.mockResolvedValue(12);

      const result = await service.findAll(mockUserId, filters);

      expect(result.pages).toBe(3); // Math.ceil(12 / 5)
      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page - 1) * limit = (2 - 1) * 5
          take: 5,
        })
      );
    });

    it('should filter by status only', async () => {
      const filters = { page: 1, limit: 10, status: 'FAILED' };
      prisma.job.findMany.mockResolvedValue([]);
      prisma.job.count.mockResolvedValue(0);

      await service.findAll(mockUserId, filters);

      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dataset: {
              project: {
                userId: mockUserId,
              },
            },
            status: 'FAILED',
          },
        })
      );
    });

    it('should filter by type only', async () => {
      const filters = { page: 1, limit: 10, type: 'EXTRACT_TEXT' };
      prisma.job.findMany.mockResolvedValue([]);
      prisma.job.count.mockResolvedValue(0);

      await service.findAll(mockUserId, filters);

      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dataset: {
              project: {
                userId: mockUserId,
              },
            },
            type: 'EXTRACT_TEXT',
          },
        })
      );
    });

    it('should handle empty metadata', async () => {
      const jobWithoutMetadata = {
        ...mockJob,
        metadata: null,
      };
      
      prisma.job.findMany.mockResolvedValue([jobWithoutMetadata]);
      prisma.job.count.mockResolvedValue(1);

      const result = await service.findAll(mockUserId, { page: 1, limit: 10 });

      expect(result.data[0].metadata).toEqual({});
    });
  });

  describe('getStats', () => {
    it('should return job statistics', async () => {
      const expectedStats = {
        total: 10,
        queued: 2,
        running: 1,
        completed: 5,
        failed: 1,
        cancelled: 1,
      };

      prisma.job.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2)  // queued
        .mockResolvedValueOnce(1)  // running
        .mockResolvedValueOnce(5)  // completed
        .mockResolvedValueOnce(1)  // failed
        .mockResolvedValueOnce(1); // cancelled

      const result = await service.getStats(mockUserId);

      expect(result).toEqual(expectedStats);

      // Verify the where clause for user isolation
      expect(prisma.job.count).toHaveBeenCalledWith({
        where: {
          dataset: {
            project: {
              userId: mockUserId,
            },
          },
        },
      });

      // Verify status-specific queries
      expect(prisma.job.count).toHaveBeenCalledWith({
        where: {
          dataset: {
            project: {
              userId: mockUserId,
            },
          },
          status: 'QUEUED',
        },
      });
    });

    it('should handle zero counts', async () => {
      // Mock all counts as zero
      prisma.job.count.mockResolvedValue(0);

      const result = await service.getStats(mockUserId);

      expect(result).toEqual({
        total: 0,
        queued: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      });

      expect(prisma.job.count).toHaveBeenCalledTimes(6);
    });
  });

  describe('findOne', () => {
    it('should return a job with details', async () => {
      prisma.job.findFirst.mockResolvedValue(mockJob);

      const result = await service.findOne(mockJobId, mockUserId);

      expect(result).toEqual({
        ...mockJob,
        dataset: {
          ...mockJob.dataset,
          fileSize: '1024', // BigInt converted to string
        },
        metadata: { source: 'test' },
      });

      expect(prisma.job.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockJobId,
          dataset: {
            project: {
              userId: mockUserId,
            },
          },
        },
        include: {
          dataset: {
            select: {
              id: true,
              name: true,
              filename: true,
              fileType: true,
              fileSize: true,
              status: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          policy: {
            select: {
              id: true,
              name: true,
              version: true,
              config: true,
            },
          },
        },
      });
    });

    it('should return null when job not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);

      const result = await service.findOne('non-existent', mockUserId);

      expect(result).toBeNull();
    });

    it('should handle null metadata', async () => {
      const jobWithNullMetadata = { ...mockJob, metadata: null };
      prisma.job.findFirst.mockResolvedValue(jobWithNullMetadata);

      const result = await service.findOne(mockJobId, mockUserId);

      expect(result.metadata).toEqual({});
    });

    it('should handle job without dataset', async () => {
      const jobWithoutDataset = { ...mockJob, dataset: null };
      prisma.job.findFirst.mockResolvedValue(jobWithoutDataset);

      const result = await service.findOne(mockJobId, mockUserId);

      expect(result.dataset).toBeNull();
    });
  });

  describe('retryJob', () => {
    it('should retry a failed job successfully', async () => {
      const failedJob = {
        ...mockJob,
        status: 'FAILED',
        dataset: { ...mockJob.dataset, status: 'FAILED' },
      };

      const newJob = {
        id: 'new-job-123',
        type: 'ANALYZE_PII',
        status: 'QUEUED',
        priority: 1,
        datasetId: mockDatasetId,
        createdById: mockUserId,
        policyId: mockPolicyId,
        metadata: {
          source: 'test',
          isRetry: true,
          originalJobId: mockJobId,
          retryAttempt: 1,
        },
      };

      prisma.job.findFirst.mockResolvedValue(failedJob);
      prisma.job.create.mockResolvedValue(newJob);
      prisma.dataset.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.retryJob(mockJobId, mockUserId);

      expect(result).toEqual({
        success: true,
        message: 'Job has been queued for retry',
        originalJobId: mockJobId,
        newJobId: 'new-job-123',
      });

      expect(prisma.job.create).toHaveBeenCalledWith({
        data: {
          type: failedJob.type,
          status: 'QUEUED',
          priority: failedJob.priority,
          datasetId: failedJob.datasetId,
          createdById: mockUserId,
          policyId: failedJob.policyId,
          metadata: {
            source: 'test',
            isRetry: true,
            originalJobId: mockJobId,
            retryAttempt: 1,
          },
        },
      });

      expect(prisma.dataset.update).toHaveBeenCalledWith({
        where: { id: mockDatasetId },
        data: { status: 'PENDING' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'UPDATE',
          resource: 'job',
          resourceId: mockJobId,
          userId: mockUserId,
          details: {
            action: 'RETRY_JOB',
            originalJobId: mockJobId,
            newJobId: 'new-job-123',
            jobType: failedJob.type,
            datasetId: failedJob.datasetId,
          },
          ipAddress: '127.0.0.1',
          userAgent: 'API',
        },
      });
    });

    it('should retry a cancelled job successfully', async () => {
      const cancelledJob = { ...mockJob, status: 'CANCELLED', dataset: mockJob.dataset };
      
      prisma.job.findFirst.mockResolvedValue(cancelledJob);
      prisma.job.create.mockResolvedValue({ id: 'new-job-123' });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.retryJob(mockJobId, mockUserId);

      expect(result.success).toBe(true);
      expect(prisma.job.create).toHaveBeenCalled();
    });

    it('should increment retry attempt for subsequent retries', async () => {
      const failedJobWithRetry = {
        ...mockJob,
        status: 'FAILED',
        metadata: { isRetry: true, originalJobId: 'original-job', retryAttempt: 2 },
        dataset: mockJob.dataset,
      };

      prisma.job.findFirst.mockResolvedValue(failedJobWithRetry);
      prisma.job.create.mockResolvedValue({ id: 'new-job-123' });
      prisma.auditLog.create.mockResolvedValue({});

      await service.retryJob(mockJobId, mockUserId);

      expect(prisma.job.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            retryAttempt: 3, // Incremented from 2
          }),
        }),
      });
    });

    it('should throw NotFoundException when job not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);

      await expect(service.retryJob(mockJobId, mockUserId)).rejects.toThrow(
        new NotFoundException('Job not found or access denied')
      );
    });

    it('should throw BadRequestException when job cannot be retried', async () => {
      const runningJob = { ...mockJob, status: 'RUNNING' };
      prisma.job.findFirst.mockResolvedValue(runningJob);

      await expect(service.retryJob(mockJobId, mockUserId)).rejects.toThrow(
        new BadRequestException('Job cannot be retried. Current status: RUNNING')
      );
    });

    it('should not update dataset status if not failed', async () => {
      const failedJob = {
        ...mockJob,
        status: 'FAILED',
        dataset: { ...mockJob.dataset, status: 'PENDING' }, // Dataset not failed
      };

      prisma.job.findFirst.mockResolvedValue(failedJob);
      prisma.job.create.mockResolvedValue({ id: 'new-job-123' });
      prisma.auditLog.create.mockResolvedValue({});

      await service.retryJob(mockJobId, mockUserId);

      expect(prisma.dataset.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelJob', () => {
    it('should cancel a queued job successfully', async () => {
      const queuedJob = { ...mockJob, status: 'QUEUED' };
      
      prisma.job.findFirst.mockResolvedValue(queuedJob);
      prisma.job.update.mockResolvedValue({});
      prisma.job.count.mockResolvedValue(0); // No other active jobs
      prisma.dataset.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.cancelJob(mockJobId, mockUserId);

      expect(result).toEqual({
        success: true,
        message: 'Job has been cancelled',
        jobId: mockJobId,
      });

      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: mockJobId },
        data: {
          status: 'CANCELLED',
          endedAt: expect.any(Date),
          error: 'Job cancelled by user',
        },
      });

      expect(prisma.dataset.update).toHaveBeenCalledWith({
        where: { id: mockDatasetId },
        data: { status: 'CANCELLED' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'UPDATE',
          resource: 'job',
          resourceId: mockJobId,
          userId: mockUserId,
          details: {
            action: 'CANCEL_JOB',
            jobId: mockJobId,
            jobType: queuedJob.type,
            datasetId: queuedJob.datasetId,
            previousStatus: 'QUEUED',
          },
          ipAddress: '127.0.0.1',
          userAgent: 'API',
        },
      });
    });

    it('should cancel a running job successfully', async () => {
      const runningJob = { ...mockJob, status: 'RUNNING' };
      
      prisma.job.findFirst.mockResolvedValue(runningJob);
      prisma.job.update.mockResolvedValue({});
      prisma.job.count.mockResolvedValue(0);
      prisma.dataset.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.cancelJob(mockJobId, mockUserId);

      expect(result.success).toBe(true);
      expect(prisma.job.update).toHaveBeenCalled();
    });

    it('should not update dataset status if other jobs are active', async () => {
      const queuedJob = { ...mockJob, status: 'QUEUED' };
      
      prisma.job.findFirst.mockResolvedValue(queuedJob);
      prisma.job.update.mockResolvedValue({});
      prisma.job.count.mockResolvedValue(2); // Other active jobs exist
      prisma.auditLog.create.mockResolvedValue({});

      await service.cancelJob(mockJobId, mockUserId);

      expect(prisma.dataset.update).not.toHaveBeenCalled();
      expect(prisma.job.count).toHaveBeenCalledWith({
        where: {
          datasetId: mockDatasetId,
          status: {
            in: ['QUEUED', 'RUNNING'],
          },
          id: {
            not: mockJobId,
          },
        },
      });
    });

    it('should throw NotFoundException when job not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);

      await expect(service.cancelJob(mockJobId, mockUserId)).rejects.toThrow(
        new NotFoundException('Job not found or access denied')
      );
    });

    it('should throw BadRequestException when job cannot be cancelled', async () => {
      const completedJob = { ...mockJob, status: 'COMPLETED' };
      prisma.job.findFirst.mockResolvedValue(completedJob);

      await expect(service.cancelJob(mockJobId, mockUserId)).rejects.toThrow(
        new BadRequestException('Job cannot be cancelled. Current status: COMPLETED')
      );
    });

    it('should throw BadRequestException for failed jobs', async () => {
      const failedJob = { ...mockJob, status: 'FAILED' };
      prisma.job.findFirst.mockResolvedValue(failedJob);

      await expect(service.cancelJob(mockJobId, mockUserId)).rejects.toThrow(
        new BadRequestException('Job cannot be cancelled. Current status: FAILED')
      );
    });
  });
});