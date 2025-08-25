import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DatasetsService } from '../datasets.service';
import { PrismaService } from '../../common/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { FileValidatorService } from '../security/file-validator.service';
import { InputSanitizerService } from '../security/input-sanitizer.service';
import { UploadFileDto } from '../dto/upload-file.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Mock the fs module
jest.mock('fs/promises');
jest.mock('path');
jest.mock('crypto');

describe('DatasetsService', () => {
  let service: DatasetsService;
  let prismaService: PrismaService;
  let queueService: QueueService;
  let fileValidator: FileValidatorService;
  let inputSanitizer: InputSanitizerService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    userId: mockUser.id,
    isActive: true,
  };

  const mockDataset = {
    id: 'dataset-123',
    name: 'Test Dataset',
    filename: 'test.txt',
    fileType: 'TXT',
    fileSize: BigInt(1024),
    sourcePath: './uploads/test.txt',
    sourceType: 'UPLOAD',
    contentHash: 'sha256-hash',
    metadataHash: 'metadata-hash',
    status: 'PENDING',
    projectId: mockProject.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: mockProject,
    jobs: [],
    findings: [],
    _count: { jobs: 0, findings: 0 },
  };

  const mockFile = {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 1024,
    buffer: Buffer.from('test content'),
    destination: './uploads',
    filename: 'test_1234567890-abc.txt',
    path: './uploads/test_1234567890-abc.txt',
  } as Express.Multer.File;

  const mockPrismaService = {
    dataset: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
    policy: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    job: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    finding: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockQueueService = {
    addPiiAnalysisJob: jest.fn(),
  };

  const mockFileValidator = {
    validateFile: jest.fn(),
  };

  const mockInputSanitizer = {
    sanitizeText: jest.fn().mockImplementation((text) => text),
    sanitizeFilename: jest.fn().mockImplementation((filename) => filename),
  };

  // Mock fs functions
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockCrypto = crypto as jest.Mocked<typeof crypto>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: FileValidatorService,
          useValue: mockFileValidator,
        },
        {
          provide: InputSanitizerService,
          useValue: mockInputSanitizer,
        },
      ],
    }).compile();

    service = module.get<DatasetsService>(DatasetsService);
    prismaService = module.get<PrismaService>(PrismaService);
    queueService = module.get<QueueService>(QueueService);
    fileValidator = module.get<FileValidatorService>(FileValidatorService);
    inputSanitizer = module.get<InputSanitizerService>(InputSanitizerService);

    // Setup common mocks
    mockFs.readFile.mockResolvedValue(Buffer.from('test content'));
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
    mockCrypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('sha256-hash'),
    } as any);
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockPath.join.mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated datasets for user', async () => {
      const datasets = [mockDataset];
      const total = 1;

      mockPrismaService.dataset.findMany.mockResolvedValue(datasets);
      mockPrismaService.dataset.count.mockResolvedValue(total);

      const result = await service.findAll(mockUser.id, { skip: 0, take: 10 });

      expect(prismaService.dataset.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          project: {
            userId: mockUser.id,
          },
        },
        include: {
          project: true,
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { jobs: true, findings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        data: [{
          ...mockDataset,
          fileSize: Number(mockDataset.fileSize),
        }],
        total,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('should filter by project ID when provided', async () => {
      mockPrismaService.dataset.findMany.mockResolvedValue([]);
      mockPrismaService.dataset.count.mockResolvedValue(0);

      await service.findAll(mockUser.id, { projectId: 'project-123' });

      expect(prismaService.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            project: { userId: mockUser.id },
            projectId: 'project-123',
          },
        })
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.dataset.findMany.mockResolvedValue([]);
      mockPrismaService.dataset.count.mockResolvedValue(25);

      const result = await service.findAll(mockUser.id, { skip: 20, take: 5 });

      expect(result.page).toBe(5); // Math.floor(20 / 5) + 1
      expect(result.totalPages).toBe(5); // Math.ceil(25 / 5)
    });
  });

  describe('findOne', () => {
    it('should return a specific dataset with details', async () => {
      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);

      const result = await service.findOne(mockDataset.id, mockUser.id);

      expect(prismaService.dataset.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockDataset.id,
          project: { userId: mockUser.id },
        },
        include: {
          project: true,
          jobs: { orderBy: { createdAt: 'desc' } },
          findings: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });

      expect(result).toEqual({
        ...mockDataset,
        fileSize: Number(mockDataset.fileSize),
      });
    });

    it('should throw NotFoundException when dataset not found', async () => {
      mockPrismaService.dataset.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadFile', () => {
    const uploadDto: UploadFileDto = {
      projectId: 'project-123',
      policyId: 'policy-123',
      description: 'Test upload',
      processImmediately: true,
    };

    it('should upload file successfully with processing', async () => {
      // Mock security validation
      mockFileValidator.validateFile.mockResolvedValue({
        isValid: true,
        riskLevel: 'low',
        reason: 'File is safe',
        details: 'No security issues detected',
        metadata: { detectedFileType: 'text/plain' },
      });

      // Mock database operations
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.policy.findUnique.mockResolvedValue({ id: 'policy-123' });
      mockPrismaService.dataset.create.mockResolvedValue(mockDataset);
      mockPrismaService.job.create.mockResolvedValue({ id: 'job-123', type: 'ANALYZE_PII', status: 'QUEUED' });
      mockPrismaService.dataset.update.mockResolvedValue(mockDataset);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.uploadFile(mockFile, uploadDto, mockUser.id);

      // Verify security validation was called
      expect(fileValidator.validateFile).toHaveBeenCalledWith(mockFile, mockFile.mimetype);

      // Verify input sanitization
      expect(inputSanitizer.sanitizeText).toHaveBeenCalledWith(uploadDto.projectId, expect.any(Object));
      expect(inputSanitizer.sanitizeFilename).toHaveBeenCalledWith(mockFile.originalname);

      // Verify project and policy verification
      expect(prismaService.project.findFirst).toHaveBeenCalled();
      expect(prismaService.policy.findUnique).toHaveBeenCalled();

      // Verify dataset creation
      expect(prismaService.dataset.create).toHaveBeenCalled();
      expect(prismaService.job.create).toHaveBeenCalled();
      expect(queueService.addPiiAnalysisJob).toHaveBeenCalled();

      expect(result).toEqual({
        dataset: {
          ...mockDataset,
          fileSize: Number(mockDataset.fileSize),
        },
        job: { id: 'job-123', type: 'ANALYZE_PII', status: 'QUEUED' },
        message: 'File uploaded successfully and queued for processing',
      });
    });

    it('should reject file that fails security validation', async () => {
      mockFileValidator.validateFile.mockResolvedValue({
        isValid: false,
        riskLevel: 'high',
        reason: 'Malicious file detected',
        details: 'File contains executable code',
      });

      mockPrismaService.auditLog.create.mockResolvedValue({});

      await expect(service.uploadFile(mockFile, uploadDto, mockUser.id))
        .rejects.toThrow(BadRequestException);

      // Should log security incident
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPLOAD',
          resource: 'file_upload_security_violation',
          details: expect.objectContaining({
            result: 'BLOCKED',
            reason: 'Malicious file detected',
          }),
        }),
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      mockFileValidator.validateFile.mockResolvedValue({ isValid: true, riskLevel: 'low' });
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.uploadFile(mockFile, uploadDto, mockUser.id))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when policy not found', async () => {
      mockFileValidator.validateFile.mockResolvedValue({ isValid: true, riskLevel: 'low' });
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.policy.findUnique.mockResolvedValue(null);

      await expect(service.uploadFile(mockFile, uploadDto, mockUser.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle upload without immediate processing', async () => {
      const uploadDtoNoProcessing = { ...uploadDto, processImmediately: false };

      mockFileValidator.validateFile.mockResolvedValue({ isValid: true, riskLevel: 'low' });
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.policy.findUnique.mockResolvedValue({ id: 'policy-123' });
      mockPrismaService.dataset.create.mockResolvedValue(mockDataset);
      mockPrismaService.dataset.update.mockResolvedValue({ ...mockDataset, status: 'UPLOADED' });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.uploadFile(mockFile, uploadDtoNoProcessing, mockUser.id);

      expect(prismaService.dataset.update).toHaveBeenCalledWith({
        where: { id: mockDataset.id },
        data: { status: 'UPLOADED' },
      });

      expect(result.job).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete dataset successfully', async () => {
      const deletedDataset = { ...mockDataset, status: 'CANCELLED' };

      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);
      mockPrismaService.dataset.update.mockResolvedValue(deletedDataset);
      mockPrismaService.auditLog.create.mockResolvedValue({});
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await service.delete(mockDataset.id, mockUser.id);

      expect(prismaService.dataset.findFirst).toHaveBeenCalled();
      expect(mockFs.unlink).toHaveBeenCalledWith(mockDataset.sourcePath);
      expect(prismaService.dataset.update).toHaveBeenCalledWith({
        where: { id: mockDataset.id },
        data: {
          status: 'CANCELLED',
          updatedAt: expect.any(Date),
        },
      });
      expect(prismaService.auditLog.create).toHaveBeenCalled();

      expect(result).toEqual({
        ...deletedDataset,
        fileSize: Number(deletedDataset.fileSize),
      });
    });

    it('should handle file deletion errors gracefully', async () => {
      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);
      mockPrismaService.dataset.update.mockResolvedValue(mockDataset);
      mockPrismaService.auditLog.create.mockResolvedValue({});
      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      // Should still succeed even if file deletion fails
      const result = await service.delete(mockDataset.id, mockUser.id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when dataset not found', async () => {
      mockPrismaService.dataset.findFirst.mockResolvedValue(null);

      await expect(service.delete('nonexistent', mockUser.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getFindings', () => {
    it('should return paginated findings for dataset', async () => {
      const mockFindings = [
        {
          id: 'finding-1',
          entityType: 'EMAIL',
          text: 'test@example.com',
          confidence: 0.95,
          startOffset: 10,
          endOffset: 26,
        },
      ];

      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);
      mockPrismaService.finding.findMany.mockResolvedValue(mockFindings);
      mockPrismaService.finding.count.mockResolvedValue(1);

      const result = await service.getFindings(mockDataset.id, mockUser.id, { page: 1, limit: 20 });

      expect(prismaService.finding.findMany).toHaveBeenCalledWith({
        where: { datasetId: mockDataset.id },
        orderBy: [
          { confidence: 'desc' },
          { startOffset: 'asc' },
        ],
        skip: 0,
        take: 20,
      });

      expect(result).toEqual({
        findings: mockFindings,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
        dataset: {
          id: mockDataset.id,
          name: mockDataset.name,
          filename: mockDataset.filename,
          status: mockDataset.status,
        },
      });
    });
  });

  describe('getAnonymizedContent', () => {
    it('should return anonymized content when job completed', async () => {
      const mockJob = {
        id: 'job-123',
        type: 'ANONYMIZE',
        status: 'COMPLETED',
        datasetId: mockDataset.id,
      };

      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);
      mockPrismaService.job.findFirst.mockResolvedValue(mockJob);
      mockFs.readdir.mockResolvedValue(['dataset-123_anonymized.txt'] as any);
      mockFs.readFile.mockResolvedValue('Anonymized content');

      const result = await service.getAnonymizedContent(mockDataset.id, mockUser.id, 'text');

      expect(result.success).toBe(true);
      expect(result.data.anonymizedText).toBe('Anonymized content');
      expect(result.data.format).toBe('text');
    });

    it('should throw NotFoundException when no anonymization job exists', async () => {
      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);
      mockPrismaService.job.findFirst.mockResolvedValue(null);

      await expect(service.getAnonymizedContent(mockDataset.id, mockUser.id))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when job not completed', async () => {
      const incompleteJob = {
        id: 'job-123',
        type: 'ANONYMIZE',
        status: 'RUNNING',
        datasetId: mockDataset.id,
      };

      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);
      mockPrismaService.job.findFirst
        .mockResolvedValueOnce(null) // No completed job
        .mockResolvedValueOnce(incompleteJob); // But there is a running job

      await expect(service.getAnonymizedContent(mockDataset.id, mockUser.id))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getJobProgress', () => {
    it('should return job progress information', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          type: 'ANALYZE_PII',
          status: 'COMPLETED',
          progress: 100,
          createdAt: new Date(),
          startedAt: new Date(),
          endedAt: new Date(),
        },
        {
          id: 'job-2',
          type: 'ANONYMIZE',
          status: 'RUNNING',
          progress: 50,
          createdAt: new Date(),
          startedAt: new Date(),
          endedAt: null,
        },
      ];

      mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);
      mockPrismaService.job.findMany.mockResolvedValue(mockJobs);

      const result = await service.getJobProgress(mockDataset.id, mockUser.id);

      expect(result.overallProgress).toBeGreaterThan(0);
      expect(result.isProcessing).toBe(true);
      expect(result.jobs).toHaveLength(2);
      expect(result.dataset.id).toBe(mockDataset.id);
    });
  });

  describe('retryProcessing', () => {
    it('should retry failed dataset processing', async () => {
      const failedDataset = { ...mockDataset, status: 'FAILED' };
      const mockJob = { id: 'job-123', type: 'ANALYZE_PII', status: 'QUEUED' };

      mockPrismaService.dataset.findFirst.mockResolvedValue(failedDataset);
      mockPrismaService.dataset.update.mockResolvedValue({ ...failedDataset, status: 'PENDING' });
      mockPrismaService.job.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.policy.findFirst.mockResolvedValue({ id: 'default-policy' });
      mockPrismaService.job.create.mockResolvedValue(mockJob);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.retryProcessing(mockDataset.id, mockUser.id);

      expect(prismaService.dataset.update).toHaveBeenCalledWith({
        where: { id: mockDataset.id },
        data: {
          status: 'PENDING',
          updatedAt: expect.any(Date),
        },
      });

      expect(prismaService.job.updateMany).toHaveBeenCalledWith({
        where: {
          datasetId: mockDataset.id,
          status: { in: ['FAILED', 'QUEUED'] },
        },
        data: {
          status: 'CANCELLED',
          updatedAt: expect.any(Date),
        },
      });

      expect(result.success).toBe(true);
      expect(result.dataset.status).toBe('PENDING');
    });

    it('should reject retry for non-failed datasets', async () => {
      const processingDataset = { ...mockDataset, status: 'PROCESSING' };

      mockPrismaService.dataset.findFirst.mockResolvedValue(processingDataset);

      await expect(service.retryProcessing(mockDataset.id, mockUser.id))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('createDemoDataset', () => {
    it('should create demo dataset with sample content', async () => {
      const demoParams = {
        projectId: 'project-123',
        userId: mockUser.id,
        name: 'Demo Dataset',
        description: 'Sample PII data',
        content: 'Email: test@example.com',
        processImmediately: true,
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 100 } as any);
      mockPrismaService.dataset.create.mockResolvedValue(mockDataset);
      mockPrismaService.policy.findFirst.mockResolvedValue({ id: 'default-policy' });
      mockPrismaService.job.create.mockResolvedValue({ id: 'job-123' });
      mockPrismaService.auditLog.create.mockResolvedValue({});
      mockQueueService.addPiiAnalysisJob.mockResolvedValue(undefined);

      const result = await service.createDemoDataset(demoParams);

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('demo-dataset-'),
        demoParams.content,
        'utf8'
      );

      expect(result.dataset).toBeDefined();
      expect(result.job).toBeDefined();
      expect(result.message).toBe('Demo dataset created successfully');
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      const mockStats = [
        {
          fileType: 'TXT',
          status: 'COMPLETED',
          _count: { id: 2 },
          _sum: { fileSize: BigInt(2048) },
        },
        {
          fileType: 'PDF',
          status: 'PENDING',
          _count: { id: 1 },
          _sum: { fileSize: BigInt(1024) },
        },
      ];

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.dataset.groupBy.mockResolvedValue(mockStats);
      mockPrismaService.dataset.count.mockResolvedValue(3);
      mockPrismaService.dataset.aggregate.mockResolvedValue({
        _sum: { fileSize: BigInt(3072) },
      });

      const result = await service.getProjectStats('project-123', mockUser.id);

      expect(result).toEqual({
        totalFiles: 3,
        totalSize: 3072,
        breakdown: [
          {
            fileType: 'TXT',
            status: 'COMPLETED',
            count: 2,
            totalSize: 2048,
          },
          {
            fileType: 'PDF',
            status: 'PENDING',
            count: 1,
            totalSize: 1024,
          },
        ],
      });
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.getProjectStats('nonexistent', mockUser.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('private methods', () => {
    describe('verifyDatasetOwnership', () => {
      it('should return dataset when user owns it', async () => {
        mockPrismaService.dataset.findFirst.mockResolvedValue(mockDataset);

        // Use reflection to call private method for testing
        const result = await (service as any).verifyDatasetOwnership(mockDataset.id, mockUser.id);

        expect(result).toEqual(mockDataset);
      });

      it('should throw NotFoundException when user does not own dataset', async () => {
        mockPrismaService.dataset.findFirst.mockResolvedValue(null);

        await expect((service as any).verifyDatasetOwnership(mockDataset.id, 'other-user'))
          .rejects.toThrow(NotFoundException);
      });
    });

    describe('getFileTypeFromMime', () => {
      it('should correctly map MIME types to file types', () => {
        expect((service as any).getFileTypeFromMime('text/csv')).toBe('CSV');
        expect((service as any).getFileTypeFromMime('application/pdf')).toBe('PDF');
        expect((service as any).getFileTypeFromMime('text/plain')).toBe('TXT');
        expect((service as any).getFileTypeFromMime('image/jpeg')).toBe('JPEG');
        expect((service as any).getFileTypeFromMime('application/unknown')).toBe('TXT');
      });
    });

    describe('getJobStageName', () => {
      it('should return user-friendly stage names', () => {
        expect((service as any).getJobStageName('FILE_PROCESSING')).toBe('Processing File');
        expect((service as any).getJobStageName('ANALYZE_PII')).toBe('Analyzing PII');
        expect((service as any).getJobStageName('ANONYMIZE')).toBe('Anonymizing Data');
        expect((service as any).getJobStageName('CUSTOM_JOB')).toBe('Custom Job');
      });
    });

    describe('getDefaultPolicyId', () => {
      it('should return default policy ID', async () => {
        mockPrismaService.policy.findFirst.mockResolvedValue({ id: 'default-policy' });

        const result = await (service as any).getDefaultPolicyId();

        expect(result).toBe('default-policy');
      });

      it('should throw BadRequestException when no default policy found', async () => {
        mockPrismaService.policy.findFirst.mockResolvedValue(null);

        await expect((service as any).getDefaultPolicyId())
          .rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations gracefully', async () => {
      const datasets = Array.from({ length: 3 }, (_, i) => ({
        ...mockDataset,
        id: `dataset-${i}`,
      }));

      mockPrismaService.dataset.findMany.mockResolvedValue(datasets);
      mockPrismaService.dataset.count.mockResolvedValue(3);

      const operations = Array.from({ length: 3 }, () =>
        service.findAll(mockUser.id, { skip: 0, take: 10 })
      );

      const results = await Promise.allSettled(operations);

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3);
    });

    it('should handle database connection failures', async () => {
      mockPrismaService.dataset.findMany.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.findAll(mockUser.id))
        .rejects.toThrow('Database connection lost');
    });

    it('should handle BigInt serialization correctly', async () => {
      const largeDataset = {
        ...mockDataset,
        fileSize: BigInt('9223372036854775807'),
      };

      mockPrismaService.dataset.findFirst.mockResolvedValue(largeDataset);

      const result = await service.findOne(mockDataset.id, mockUser.id);

      expect(typeof result.fileSize).toBe('number');
      expect(result.fileSize).toBe(9223372036854775807);
    });

    it('should handle file system errors gracefully', async () => {
      mockFileValidator.validateFile.mockResolvedValue({ isValid: true, riskLevel: 'low' });
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockFs.readFile.mockRejectedValue(new Error('File system error'));

      const uploadDto: UploadFileDto = {
        projectId: 'project-123',
        processImmediately: true,
      };

      await expect(service.uploadFile(mockFile, uploadDto, mockUser.id))
        .rejects.toThrow('File system error');
    });
  });
});