import { logger } from './utils/logger.js';
import { db } from './database/prisma.js';
import { WorkerManager } from './workers/index.js';
import { checkQueueHealth } from './queue/queues.js';
import { Config } from './config/index.js';

async function main(): Promise<void> {
  logger.info('🚀 Starting Maskwise Worker Service...');

  try {
    // Connect to database
    logger.info('Connecting to database...');
    await db.connect();

    // Check database health
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('✅ Database connection healthy');

    // Check queue health  
    logger.info('Checking queue health...');
    const queueHealth = await checkQueueHealth();
    const unhealthyQueues = Object.entries(queueHealth)
      .filter(([_, healthy]) => !healthy)
      .map(([queue, _]) => queue);

    if (unhealthyQueues.length > 0) {
      logger.warn('Some queues are unhealthy', { unhealthyQueues });
    } else {
      logger.info('✅ All queues healthy');
    }

    // Start workers
    const workerManager = new WorkerManager();
    await workerManager.start();

    logger.info('🎉 Maskwise Worker Service started successfully!');
    logger.info('Configuration:', {
      concurrency: Config.worker.concurrency,
      retryAttempts: Config.worker.retryAttempts,
      redisHost: Config.redis.host,
      redisPort: Config.redis.port,
      uploadDir: Config.storage.uploadDir,
      outputDir: Config.storage.outputDir,
    });

    // Keep the process alive
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start worker service', { error });
    
    // Cleanup on failure
    try {
      await db.disconnect();
    } catch (dbError) {
      logger.error('Failed to disconnect from database during cleanup', { dbError });
    }
    
    process.exit(1);
  }
}

// Handle exit signals gracefully
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

// Start the service
main().catch((error) => {
  logger.error('Unhandled error in main', { error });
  process.exit(1);
});