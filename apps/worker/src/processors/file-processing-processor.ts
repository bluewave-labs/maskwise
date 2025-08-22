import { Job } from 'bullmq';
import { BaseProcessor } from './base-processor.js';
import { FileProcessingJobData, JobType, JobData } from '../types/jobs.js';
import { logger } from '../utils/logger.js';
import { queues } from '../queue/queues.js';
import * as fs from 'fs/promises';

export class FileProcessingProcessor extends BaseProcessor {
  protected jobType = JobType.FILE_PROCESSING;

  protected async process(job: Job<JobData>): Promise<any> {
    const data = job.data as FileProcessingJobData;
    const { jobId, userId, filePath, fileName, mimeType, fileSize } = data;

    logger.info('Starting file processing', {
      jobId,
      fileName,
      mimeType,
      fileSize,
    });

    // Update progress
    await this.updateJobStatus(jobId, 'processing' as any, 10);

    // Validate file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Update progress
    await this.updateJobStatus(jobId, 'processing' as any, 20);

    // Determine extraction method based on MIME type
    const extractionMethod = this.getExtractionMethod(mimeType);
    
    logger.info('Determined extraction method', {
      jobId,
      mimeType,
      extractionMethod,
    });

    // Update progress
    await this.updateJobStatus(jobId, 'processing' as any, 30);

    // Queue PII analysis job (simplified - skip text extraction for basic implementation)
    const piiAnalysisJobData: any = {
      jobId: jobId, // Use the existing job ID from datasets service
      datasetId: data.datasetId,
      metadata: {
        fileName,
        mimeType,
        filePath,
        extractionMethod
      }
    };

    const piiAnalysisJob = await queues[JobType.PII_ANALYSIS].add(
      'analyze-pii',
      piiAnalysisJobData,
      {
        priority: 1,
        delay: 1000, // Small delay to ensure file is ready
      }
    );

    logger.info('Queued PII analysis job', {
      jobId,
      piiAnalysisJobId: piiAnalysisJob.id,
    });

    // Update progress
    await this.updateJobStatus(jobId, 'processing' as any, 50);

    // Log audit action
    await this.logAuditAction(
      userId,
      'UPLOAD',
      'dataset',
      data.datasetId || jobId,
      {
        fileName,
        fileSize,
        mimeType,
        extractionMethod,
      }
    );

    // Update progress - file processing is complete, PII analysis is queued
    await this.updateJobStatus(jobId, 'processing' as any, 75);

    return {
      piiAnalysisJobId: piiAnalysisJob.id,
      extractionMethod,
      fileProcessed: true,
    };
  }

  private getExtractionMethod(mimeType: string): 'tika' | 'ocr' | 'direct' {
    const imageTypes = [
      'image/jpeg',
      'image/png', 
      'image/tiff',
      'image/bmp',
      'image/gif'
    ];

    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    const textTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'text/html',
      'text/xml'
    ];

    if (imageTypes.includes(mimeType)) {
      return 'ocr';
    } else if (documentTypes.includes(mimeType)) {
      return 'tika';
    } else if (textTypes.includes(mimeType)) {
      return 'direct';
    } else {
      // Default to Tika for unknown types
      return 'tika';
    }
  }
}