import { Worker } from 'bullmq';
import { redisConnection } from '../queue/connection.js';
import { JobType } from '../types/jobs.js';
import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Import processors
import { FileProcessingProcessor } from '../processors/file-processing-processor.js';
import { PIIAnalysisProcessor } from '../processors/pii-analysis-processor.js';
import { anonymizationProcessor } from '../processors/anonymization-processor.js';

class WorkerManager {
  private workers: Worker[] = [];
  private isShuttingDown = false;

  public async start(): Promise<void> {
    logger.info('Starting workers...');

    try {
      // Create worker instances
      const fileProcessingWorker = this.createWorker(
        JobType.FILE_PROCESSING,
        new FileProcessingProcessor().createProcessor()
      );

      const piiAnalysisWorker = this.createWorker(
        JobType.PII_ANALYSIS,
        new PIIAnalysisProcessor().createProcessor()
      );

      const anonymizationWorker = this.createWorker(
        JobType.ANONYMIZATION,
        anonymizationProcessor.createProcessor()
      );

      this.workers.push(fileProcessingWorker, piiAnalysisWorker, anonymizationWorker);

      logger.info(`Started ${this.workers.length} workers`);

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start workers', { error });
      throw error;
    }
  }

  private createWorker(queueName: string, processor: any): Worker {
    const worker = new Worker(queueName, processor, {
      connection: redisConnection,
      concurrency: Config.worker.concurrency,
      maxStalledCount: 1,
      stalledInterval: 30000,
    });

    // Worker event handlers
    worker.on('ready', () => {
      logger.info(`Worker ready: ${queueName}`);
    });

    worker.on('error', (error) => {
      logger.error(`Worker error: ${queueName}`, { error });
    });

    worker.on('failed', (job, error) => {
      logger.error(`Job failed: ${queueName}`, {
        jobId: job?.id,
        error: error.message,
      });
    });

    worker.on('completed', (job, result) => {
      logger.info(`Job completed: ${queueName}`, {
        jobId: job.id,
        result,
      });
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`Job stalled: ${queueName}`, { jobId });
    });

    return worker;
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress...');
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // Stop accepting new jobs
        const shutdownPromises = this.workers.map(async (worker) => {
          logger.info(`Closing worker: ${worker.name}`);
          await worker.close();
        });

        await Promise.all(shutdownPromises);
        
        logger.info('All workers closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
  }

  public async stop(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info('Stopping workers...');

    for (const worker of this.workers) {
      try {
        await worker.close();
        logger.info(`Stopped worker: ${worker.name}`);
      } catch (error) {
        logger.error(`Failed to stop worker: ${worker.name}`, { error });
      }
    }

    this.workers = [];
    logger.info('All workers stopped');
  }
}

export { WorkerManager };