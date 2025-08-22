import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileValidatorService } from './security/file-validator.service';
import { InputSanitizerService } from './security/input-sanitizer.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as mimeTypes from 'mime-types';
import * as crypto from 'crypto';

/**
 * Datasets Service
 * 
 * Core business logic for dataset and file management.
 * Handles file upload processing, metadata extraction, security validation,
 * and integration with the PII detection job queue.
 * 
 * Key responsibilities:
 * - File upload and storage management
 * - Dataset CRUD operations with user isolation
 * - SHA-256 content hashing for integrity verification
 * - Automatic job creation for PII analysis pipeline
 * - Project-level statistics and analytics
 * - Comprehensive audit logging
 */
@Injectable()
export class DatasetsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private fileValidator: FileValidatorService,
    private inputSanitizer: InputSanitizerService,
  ) {}

  async findAll(userId: string, params?: {
    skip?: number;
    take?: number;
    projectId?: string;
  }) {
    const { skip = 0, take = 50, projectId } = params || {};

    let where: any = {
      project: {
        userId: userId,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const datasets = await this.prisma.dataset.findMany({
      skip,
      take,
      where,
      include: {
        project: true,
        jobs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            jobs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await this.prisma.dataset.count({ where });

    // Convert BigInt to Number for serialization
    const serializedDatasets = datasets.map(dataset => ({
      ...dataset,
      fileSize: Number(dataset.fileSize),
    }));

    return {
      data: serializedDatasets,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: string, userId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: {
        id,
        project: {
          userId: userId,
        },
      },
      include: {
        project: true,
        jobs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        findings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Convert BigInt to Number for serialization
    return {
      ...dataset,
      fileSize: Number(dataset.fileSize),
    };
  }

  /**
   * Upload File and Create Dataset
   * 
   * Processes uploaded files by:
   * 1. Validating project access and policy existence
   * 2. Computing SHA-256 hash for file integrity
   * 3. Detecting file type from MIME type
   * 4. Creating dataset record in database
   * 5. Queuing PII analysis job
   * 6. Logging audit trail
   * 
   * @param file - Multer file object from upload
   * @param uploadFileDto - Upload metadata (projectId, policyId, description)
   * @param userId - Authenticated user ID
   * @returns Dataset and job creation details
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
    userId: string,
  ) {
    // 1. Enhanced Security Validation
    const fileValidation = await this.fileValidator.validateFile(file, file.mimetype);
    if (!fileValidation.isValid) {
      // Log security incident
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'UPLOAD',
          resource: 'file_upload_security_violation',
          resourceId: 'N/A',
          details: {
            result: 'BLOCKED',
            reason: fileValidation.reason,
            riskLevel: fileValidation.riskLevel,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            details: fileValidation.details
          },
        },
      });

      throw new BadRequestException(`File security validation failed: ${fileValidation.details}`);
    }

    // 2. Sanitize all input data
    const sanitizedDto = {
      projectId: this.inputSanitizer.sanitizeText(uploadFileDto.projectId, {
        maxLength: 50,
        allowedCharacters: 'a-zA-Z0-9-_',
        allowHtml: false,
        allowSpecialCharacters: false
      }),
      policyId: uploadFileDto.policyId ? this.inputSanitizer.sanitizeText(uploadFileDto.policyId, {
        maxLength: 50,
        allowedCharacters: 'a-zA-Z0-9-_',
        allowHtml: false,
        allowSpecialCharacters: false
      }) : undefined,
      description: uploadFileDto.description ? this.inputSanitizer.sanitizeText(uploadFileDto.description, {
        maxLength: 500,
        allowHtml: false,
        allowSpecialCharacters: true
      }) : undefined
    };

    // 3. Sanitize filename
    const sanitizedFilename = this.inputSanitizer.sanitizeFilename(file.originalname);

    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id: sanitizedDto.projectId,
        userId: userId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Verify policy exists if provided
    if (sanitizedDto.policyId) {
      const policy = await this.prisma.policy.findUnique({
        where: { id: sanitizedDto.policyId },
      });

      if (!policy) {
        throw new BadRequestException('Policy not found');
      }
    }

    // Calculate file hash
    const fileBuffer = await fs.readFile(file.path);
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Determine file type from MIME type
    const fileType = this.getFileTypeFromMime(file.mimetype);

    // Create dataset record (each file is a dataset in this schema)
    const dataset = await this.prisma.dataset.create({
      data: {
        name: sanitizedDto.description || sanitizedFilename,
        filename: sanitizedFilename,
        fileType,
        fileSize: BigInt(file.size),
        sourcePath: file.path,
        sourceType: 'UPLOAD',
        contentHash,
        metadataHash: contentHash, // Using same hash for now
        status: 'PENDING',
        projectId: sanitizedDto.projectId,
      },
    });

    // Create processing job
    const job = await this.prisma.job.create({
      data: {
        type: 'ANALYZE_PII',
        status: 'QUEUED',
        datasetId: dataset.id,
        createdById: userId,
        policyId: sanitizedDto.policyId || await this.getDefaultPolicyId(),
        metadata: {
          fileName: sanitizedFilename,
          originalFileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          contentHash,
          securityValidation: {
            riskLevel: fileValidation.riskLevel,
            detectedFileType: fileValidation.metadata?.detectedFileType,
            validationPassed: true
          }
        },
      },
    });

    // Queue the job for processing
    await this.queueService.addPiiAnalysisJob({
      datasetId: dataset.id,
      projectId: sanitizedDto.projectId,
      filePath: path.resolve(file.path), // Use absolute path for worker
      userId,
      policyId: sanitizedDto.policyId,
      jobId: job.id, // Pass the database job ID
    });

    // Log audit action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPLOAD',
        resource: 'dataset',
        resourceId: dataset.id,
        details: {
          fileName: sanitizedFilename,
          originalFileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          projectId: sanitizedDto.projectId,
          jobId: job.id,
          securityValidation: {
            riskLevel: fileValidation.riskLevel,
            validationPassed: true
          }
        },
      },
    });

    return {
      dataset: {
        ...dataset,
        fileSize: Number(dataset.fileSize),
      },
      job,
      message: 'File uploaded successfully and queued for processing',
    };
  }

  async delete(id: string, userId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: {
        id,
        project: {
          userId: userId,
        },
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Delete file from filesystem
    try {
      await fs.unlink(dataset.sourcePath);
    } catch (error) {
      console.warn(`Failed to delete file: ${dataset.sourcePath}`, error);
    }

    // Soft delete dataset (mark as cancelled)
    const deletedDataset = await this.prisma.dataset.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // Log audit action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'dataset',
        resourceId: id,
        details: {
          name: dataset.name,
          filename: dataset.filename,
        },
      },
    });

    // Convert BigInt to Number for serialization
    return {
      ...deletedDataset,
      fileSize: Number(deletedDataset.fileSize),
    };
  }

  /**
   * Get PII Findings for Dataset
   * 
   * Retrieves all PII findings detected for a specific dataset.
   * Only returns findings for datasets owned by the authenticated user.
   * 
   * @param id - Dataset ID
   * @param userId - User ID (for ownership verification)
   * @param pagination - Pagination options
   * @returns Paginated findings data
   */
  async getFindings(id: string, userId: string, pagination: { page: number; limit: number }) {
    // Verify dataset ownership and exists
    const dataset = await this.verifyDatasetOwnership(id, userId);

    // Get findings with pagination
    const skip = (pagination.page - 1) * pagination.limit;
    
    const [findings, totalCount] = await Promise.all([
      this.prisma.finding.findMany({
        where: { datasetId: id },
        orderBy: [
          { confidence: 'desc' },
          { startOffset: 'asc' }
        ],
        skip,
        take: pagination.limit,
      }),
      this.prisma.finding.count({
        where: { datasetId: id }
      })
    ]);

    return {
      findings,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / pagination.limit)
      },
      dataset: {
        id: dataset.id,
        name: dataset.name,
        filename: dataset.filename,
        status: dataset.status
      }
    };
  }

  /**
   * Get Anonymized Content for Dataset
   * 
   * Retrieves anonymized content for a dataset from the worker storage.
   * Reads the anonymized files generated by the anonymization processor
   * and returns them in the requested format.
   * 
   * @param id - Dataset ID
   * @param userId - User ID (for ownership verification)
   * @param format - Output format (json, text, or auto-detect)
   * @returns Anonymized content with metadata
   */
  async getAnonymizedContent(id: string, userId: string, format?: string) {
    // Verify dataset ownership
    const dataset = await this.verifyDatasetOwnership(id, userId);

    // Check if anonymization job exists and is completed
    const anonymizationJob = await this.prisma.job.findFirst({
      where: {
        datasetId: id,
        type: 'ANONYMIZE',
        status: 'COMPLETED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!anonymizationJob) {
      // Check if there's any anonymization job at all
      const anyAnonymizationJob = await this.prisma.job.findFirst({
        where: {
          datasetId: id,
          type: 'ANONYMIZE',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!anyAnonymizationJob) {
        throw new NotFoundException('No anonymization job found for this dataset');
      } else {
        throw new BadRequestException(`Anonymization not completed yet. Current status: ${anyAnonymizationJob.status}`);
      }
    }

    // Look for anonymized files in worker storage
    // Files are stored in worker service storage directory
    // API service runs from apps/api, worker storage is at apps/worker/storage
    const apiDir = process.cwd(); // /Users/.../maskwise/apps/api
    const appsDir = path.resolve(apiDir, '..'); // /Users/.../maskwise/apps
    const workerStorageDir = path.join(appsDir, 'worker', 'storage');
    const anonymizedDir = path.join(workerStorageDir, 'anonymized');

    // Find anonymized files for this dataset
    try {
      const files = await fs.readdir(anonymizedDir);
      const datasetFiles = files.filter(file => file.includes(id));

      if (datasetFiles.length === 0) {
        throw new NotFoundException('Anonymized content not found in storage');
      }

      // Get the most recent file (based on timestamp in filename)
      const mostRecentFile = datasetFiles.sort().reverse()[0];
      const filePath = path.join(anonymizedDir, mostRecentFile);

      // Read the content
      const content = await fs.readFile(filePath, 'utf-8');

      // Determine if this is JSON content or raw text
      let parsedContent: any;
      let isJsonFormat = false;

      try {
        parsedContent = JSON.parse(content);
        isJsonFormat = true;
      } catch {
        // Not JSON, treat as raw text
        parsedContent = {
          anonymizedText: content,
          format: 'text',
          datasetId: id,
          timestamp: new Date().toISOString(),
        };
      }

      // Handle format parameter
      const requestedFormat = format?.toLowerCase() || 'json';

      if (requestedFormat === 'text' || requestedFormat === 'txt') {
        // Return only the anonymized text
        return {
          success: true,
          data: {
            datasetId: id,
            anonymizedText: isJsonFormat ? parsedContent.anonymizedText : content,
            format: 'text',
            timestamp: isJsonFormat ? parsedContent.timestamp : new Date().toISOString(),
          },
        };
      } else {
        // Return full JSON structure (default)
        return {
          success: true,
          data: {
            datasetId: id,
            anonymizedText: isJsonFormat ? parsedContent.anonymizedText : content,
            originalLength: isJsonFormat ? parsedContent.originalLength : null,
            anonymizedLength: isJsonFormat ? parsedContent.anonymizedLength : content.length,
            operationsApplied: isJsonFormat ? parsedContent.operationsApplied : null,
            operations: isJsonFormat ? parsedContent.operations : [],
            timestamp: isJsonFormat ? parsedContent.timestamp : new Date().toISOString(),
            format: 'json',
            metadata: {
              filename: mostRecentFile,
              jobId: anonymizationJob.id,
              dataset: {
                id: dataset.id,
                name: dataset.name,
                filename: dataset.filename,
                fileType: dataset.fileType,
              },
            },
          },
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error reading anonymized content:', error);
      throw new NotFoundException('Failed to retrieve anonymized content');
    }
  }

  /**
   * Download anonymized content in specified format
   * 
   * @param id - Dataset ID
   * @param userId - Current user ID
   * @param format - Download format (txt, json, csv)
   * @returns File content with proper headers for download
   */
  async downloadAnonymizedContent(id: string, userId: string, format: string = 'txt') {
    // Get the anonymized content first
    const contentResult = await this.getAnonymizedContent(id, userId, 'json');
    const data = contentResult.data;

    // Validate format
    const validFormats = ['txt', 'json', 'csv'];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new BadRequestException(`Invalid format. Supported formats: ${validFormats.join(', ')}`);
    }

    const dataset = await this.verifyDatasetOwnership(id, userId);
    const baseFilename = `${dataset.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_anonymized`;
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format.toLowerCase()) {
      case 'txt':
        content = data.anonymizedText;
        contentType = 'text/plain';
        filename = `${baseFilename}_${timestamp}.txt`;
        break;

      case 'json':
        content = JSON.stringify({
          dataset: {
            id: data.datasetId,
            name: dataset.name,
            originalFilename: dataset.filename,
            fileType: dataset.fileType,
          },
          anonymization: {
            timestamp: data.timestamp,
            originalLength: data.originalLength,
            anonymizedLength: data.anonymizedLength,
            operationsApplied: data.operationsApplied,
          },
          content: {
            anonymizedText: data.anonymizedText,
          },
          operations: data.operations || [],
          metadata: data.metadata,
        }, null, 2);
        contentType = 'application/json';
        filename = `${baseFilename}_${timestamp}.json`;
        break;

      case 'csv':
        // For CSV, create a simple format with the operations
        const csvLines = ['Entity Type,Original Text,Anonymized Text,Position,Confidence,Operator'];
        
        if (data.operations && data.operations.length > 0) {
          data.operations.forEach(op => {
            const originalText = data.anonymizedText.substring(op.start, op.end).replace(/"/g, '""');
            const anonymizedText = op.text.replace(/"/g, '""');
            csvLines.push(`"${op.entity_type}","${originalText}","${anonymizedText}","${op.start}-${op.end}","N/A","${op.operator}"`);
          });
        }
        
        // Add summary row
        csvLines.push('');
        csvLines.push('Summary,,,,,');
        csvLines.push(`Total Operations,${data.operationsApplied || 0},,,,`);
        csvLines.push(`Original Length,${data.originalLength || 0},,,,`);
        csvLines.push(`Anonymized Length,${data.anonymizedLength || 0},,,,`);
        
        content = csvLines.join('\n');
        contentType = 'text/csv';
        filename = `${baseFilename}_${timestamp}.csv`;
        break;
    }

    // Log the download action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DOWNLOAD',
        resource: 'dataset',
        resourceId: id,
        details: {
          action: 'download_anonymized_content',
          format,
          filename,
          datasetName: dataset.name,
        },
      },
    });

    return {
      content,
      contentType,
      filename,
    };
  }

  /**
   * Get job progress for dataset
   * 
   * @param id - Dataset ID
   * @param userId - Current user ID
   * @returns Job progress information with stages and estimates
   */
  async getJobProgress(id: string, userId: string) {
    // Verify dataset ownership
    const dataset = await this.verifyDatasetOwnership(id, userId);

    // Get all jobs for this dataset ordered by creation time
    const jobs = await this.prisma.job.findMany({
      where: {
        datasetId: id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        startedAt: true,
        endedAt: true,
        error: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate overall progress and current stage
    const jobStages = ['FILE_PROCESSING', 'ANALYZE_PII', 'ANONYMIZE'];
    let overallProgress = 0;
    let currentStage = 'Initializing';
    let isProcessing = false;

    // Map jobs with stage information
    const jobsWithStage = jobs.map(job => {
      const stageIndex = jobStages.indexOf(job.type);
      const stageName = this.getJobStageName(job.type);
      
      let estimatedCompletion = null;
      if (job.status === 'RUNNING' && job.progress > 0) {
        // Simple estimation based on current progress
        const elapsed = new Date().getTime() - new Date(job.startedAt || job.createdAt).getTime();
        const estimated = (elapsed / job.progress) * (100 - job.progress);
        estimatedCompletion = new Date(Date.now() + estimated).toISOString();
      }

      return {
        ...job,
        stage: stageName,
        estimatedCompletion,
        stageIndex,
      };
    });

    // Calculate overall progress
    if (jobs.length > 0) {
      // Count jobs for stages that exist - use actual job count instead of predefined stages
      const totalStages = jobs.length;
      
      let completedStages = 0;
      let currentProgress = 0;
      let hasRunningJob = false;

      for (const job of jobsWithStage) {
        if (job.status === 'COMPLETED') {
          completedStages++;
        } else if (job.status === 'RUNNING') {
          currentProgress = job.progress / 100;
          currentStage = `${job.stage} (${job.progress}%)`;
          isProcessing = true;
          hasRunningJob = true;
        } else if (job.status === 'QUEUED') {
          currentStage = `Queued: ${job.stage}`;
          isProcessing = true;
        } else if (job.status === 'FAILED') {
          currentStage = `Failed: ${job.stage}`;
          break;
        }
      }

      // Calculate overall progress based on actual stages
      if (hasRunningJob) {
        overallProgress = Math.round(((completedStages + currentProgress) / totalStages) * 100);
      } else if (completedStages === totalStages && totalStages > 0) {
        overallProgress = 100;
        currentStage = 'Completed';
        isProcessing = false;
      } else {
        overallProgress = Math.round((completedStages / totalStages) * 100);
        if (completedStages === totalStages && completedStages > 0) {
          overallProgress = 100;
          currentStage = 'Completed';
          isProcessing = false;
        }
      }
    }

    return {
      jobs: jobsWithStage.map(({ stageIndex, ...job }) => job),
      overallProgress,
      currentStage,
      isProcessing,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        status: dataset.status,
      },
    };
  }

  /**
   * Get user-friendly stage name for job type
   */
  private getJobStageName(jobType: string): string {
    switch (jobType) {
      case 'FILE_PROCESSING':
        return 'Processing File';
      case 'ANALYZE_PII':
      case 'PII_ANALYSIS':
        return 'Analyzing PII';
      case 'ANONYMIZE':
        return 'Anonymizing Data';
      default:
        return jobType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  /**
   * Verify Dataset Ownership
   * 
   * Validates that a dataset exists and belongs to the specified user.
   * 
   * @param id - Dataset ID
   * @param userId - User ID to verify ownership against
   * @returns Dataset if owned by user
   * @throws NotFoundException if dataset not found or access denied
   */
  private async verifyDatasetOwnership(id: string, userId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: {
        id,
        project: {
          userId: userId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found or access denied');
    }

    return dataset;
  }

  private async getDefaultPolicyId(): Promise<string> {
    const defaultPolicy = await this.prisma.policy.findFirst({
      where: {
        name: 'GDPR Compliance',
      },
    });

    if (!defaultPolicy) {
      throw new BadRequestException('No default policy found');
    }

    return defaultPolicy.id;
  }

  /**
   * File Type Detection from MIME Type
   * 
   * Maps MIME types to database FileType enum values.
   * Used for categorizing uploaded files for appropriate processing pipelines.
   * 
   * @param mimeType - MIME type from uploaded file
   * @returns FileType enum value for database storage
   */
  private getFileTypeFromMime(mimeType: string): 'CSV' | 'JSONL' | 'PARQUET' | 'TXT' | 'PDF' | 'DOCX' | 'DOC' | 'XLSX' | 'XLS' | 'PPTX' | 'PPT' | 'ODT' | 'ODS' | 'ODP' | 'RTF' | 'HTML' | 'XML' | 'JPEG' | 'PNG' | 'TIFF' | 'BMP' | 'GIF' {
    // Text formats
    if (mimeType === 'text/csv') {
      return 'CSV';
    } else if (mimeType === 'application/json' || mimeType === 'application/jsonl') {
      return 'JSONL';
    } else if (mimeType === 'application/parquet') {
      return 'PARQUET';
    } else if (mimeType === 'text/html') {
      return 'HTML';
    } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
      return 'XML';
    } else if (mimeType.startsWith('text/')) {
      return 'TXT';
    }
    
    // Document formats
    else if (mimeType === 'application/pdf') {
      return 'PDF';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'DOCX';
    } else if (mimeType === 'application/msword') {
      return 'DOC';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return 'XLSX';
    } else if (mimeType === 'application/vnd.ms-excel') {
      return 'XLS';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return 'PPTX';
    } else if (mimeType === 'application/vnd.ms-powerpoint') {
      return 'PPT';
    } else if (mimeType === 'application/vnd.oasis.opendocument.text') {
      return 'ODT';
    } else if (mimeType === 'application/vnd.oasis.opendocument.spreadsheet') {
      return 'ODS';
    } else if (mimeType === 'application/vnd.oasis.opendocument.presentation') {
      return 'ODP';
    } else if (mimeType === 'application/rtf' || mimeType === 'text/rtf') {
      return 'RTF';
    }
    
    // Image formats
    else if (mimeType === 'image/jpeg') {
      return 'JPEG';
    } else if (mimeType === 'image/png') {
      return 'PNG';
    } else if (mimeType === 'image/tiff') {
      return 'TIFF';
    } else if (mimeType === 'image/bmp') {
      return 'BMP';
    } else if (mimeType === 'image/gif') {
      return 'GIF';
    }
    
    // Default fallback
    else {
      return 'TXT'; // Default to TXT for unsupported types
    }
  }

  async getProjectStats(projectId: string, userId: string) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const stats = await this.prisma.dataset.groupBy({
      by: ['fileType', 'status'],
      where: {
        projectId,
      },
      _count: {
        id: true,
      },
      _sum: {
        fileSize: true,
      },
    });

    const totalFiles = await this.prisma.dataset.count({
      where: { projectId },
    });

    const totalSize = await this.prisma.dataset.aggregate({
      where: { projectId },
      _sum: {
        fileSize: true,
      },
    });

    return {
      totalFiles,
      totalSize: Number(totalSize._sum.fileSize || 0),
      breakdown: stats.map(stat => ({
        fileType: stat.fileType,
        status: stat.status,
        count: stat._count.id,
        totalSize: Number(stat._sum.fileSize || 0),
      })),
    };
  }
}