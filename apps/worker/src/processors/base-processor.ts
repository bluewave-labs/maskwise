import { Job, Processor } from 'bullmq';
import { logger } from '../utils/logger.js';
import { db } from '../database/prisma.js';
import { JobData, JobStatus } from '../types/jobs.js';

export abstract class BaseProcessor {
  protected abstract jobType: string;

  protected async updateJobStatus(
    jobId: string, 
    status: JobStatus, 
    progress?: number, 
    result?: any, 
    error?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status: status as any,
        updatedAt: new Date(),
      };

      if (progress !== undefined) updateData.progress = progress;
      if (result) updateData.metadata = result;
      if (error !== undefined) updateData.error = error;
      if (status === JobStatus.COMPLETED) updateData.endedAt = new Date();

      await db.client.job.update({
        where: { id: jobId },
        data: updateData,
      });

      logger.info(`Job status updated`, {
        jobId,
        status,
        progress,
        jobType: this.jobType,
      });
    } catch (error) {
      logger.error(`Failed to update job status`, {
        jobId,
        status,
        error,
        jobType: this.jobType,
      });
    }
  }

  protected async logAuditAction(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details?: any
  ): Promise<void> {
    try {
      await db.client.auditLog.create({
        data: {
          userId,
          action: action as any,
          resource,
          resourceId,
          details: details || null,
        },
      });
    } catch (error) {
      logger.error(`Failed to log audit action`, {
        userId,
        action,
        resource,
        resourceId,
        error,
      });
    }
  }

  public createProcessor(): Processor<JobData> {
    return async (job: Job<JobData>) => {
      const { data } = job;
      logger.info(`Processing ${this.jobType} job`, {
        jobId: data.jobId,
        userId: data.userId,
        jobType: this.jobType,
      });

      try {
        // Update job status to processing
        await this.updateJobStatus(data.jobId, JobStatus.PROCESSING, 0);

        // Process the job
        const result = await this.process(job);

        // Update job status to completed
        await this.updateJobStatus(data.jobId, JobStatus.COMPLETED, 100, result);

        logger.info(`${this.jobType} job completed successfully`, {
          jobId: data.jobId,
          userId: data.userId,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error(`${this.jobType} job failed`, {
          jobId: data.jobId,
          userId: data.userId,
          error: errorMessage,
        });

        // Update job status to failed
        await this.updateJobStatus(data.jobId, JobStatus.FAILED, undefined, undefined, errorMessage);

        throw error;
      }
    };
  }

  protected abstract process(job: Job<JobData>): Promise<any>;
}