import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

/**
 * Queue Service
 * 
 * Manages BullMQ job queues for processing tasks.
 * Currently handles PII analysis jobs but can be extended for other job types.
 */
@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private redis: Redis;
  private piiAnalysisQueue: Queue;

  async onModuleInit() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null, // Required by BullMQ
    });

    // Initialize queues
    this.piiAnalysisQueue = new Queue('pii-analysis', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50,     // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.logger.log('Queue service initialized with PII analysis queue');
  }

  /**
   * Add PII Analysis Job
   * 
   * Queues a dataset for PII detection and analysis.
   * 
   * @param jobData - Job data containing dataset ID and processing options
   * @returns Job instance with ID and metadata
   */
  async addPiiAnalysisJob(jobData: {
    datasetId: string;
    projectId: string;
    filePath: string;
    userId: string;
    policyId?: string;
    jobId: string; // Database job ID for tracking
  }) {
    try {
      const job = await this.piiAnalysisQueue.add('analyze-pii', jobData, {
        priority: 1, // Higher priority for PII analysis
        delay: 1000, // Small delay to ensure database transaction completes
      });

      this.logger.log(`Added PII analysis job: ${job.id} for dataset: ${jobData.datasetId}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add PII analysis job for dataset ${jobData.datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Get Queue Statistics
   * 
   * Returns current queue status and job counts for monitoring.
   */
  async getQueueStats() {
    try {
      const waiting = await this.piiAnalysisQueue.getWaiting();
      const active = await this.piiAnalysisQueue.getActive();
      const completed = await this.piiAnalysisQueue.getCompleted();
      const failed = await this.piiAnalysisQueue.getFailed();

      return {
        piiAnalysis: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Health Check
   * 
   * Verifies queue and Redis connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed:', error);
      return false;
    }
  }
}