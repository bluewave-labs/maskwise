import { Queue, QueueOptions } from 'bullmq';
import { redisConnection } from './connection.js';
import { JobType, JobData } from '../types/jobs.js';
import { logger } from '../utils/logger.js';

const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
};

// Create queues for different job types
export const fileProcessingQueue = new Queue<JobData>(JobType.FILE_PROCESSING, queueOptions);
export const textExtractionQueue = new Queue<JobData>(JobType.EXTRACT_TEXT, queueOptions);
export const piiAnalysisQueue = new Queue<JobData>(JobType.PII_ANALYSIS, queueOptions);
export const anonymizationQueue = new Queue<JobData>(JobType.ANONYMIZATION, queueOptions);

// Queue registry for easy access
export const queues = {
  [JobType.FILE_PROCESSING]: fileProcessingQueue,
  [JobType.EXTRACT_TEXT]: textExtractionQueue,
  [JobType.PII_ANALYSIS]: piiAnalysisQueue,
  [JobType.ANONYMIZATION]: anonymizationQueue,
} as const;

// Queue health monitoring
export async function checkQueueHealth(): Promise<Record<string, boolean>> {
  const health: Record<string, boolean> = {};
  
  for (const [queueName, queue] of Object.entries(queues)) {
    try {
      // Simple health check by getting queue info
      await queue.getJobCounts();
      health[queueName] = true;
      logger.debug(`Queue ${queueName} is healthy`);
    } catch (error) {
      health[queueName] = false;
      logger.error(`Queue ${queueName} health check failed`, { error });
    }
  }
  
  return health;
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  logger.info('Closing queues...');
  
  for (const [queueName, queue] of Object.entries(queues)) {
    try {
      await queue.close();
      logger.info(`Closed queue: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to close queue: ${queueName}`, { error });
    }
  }
}