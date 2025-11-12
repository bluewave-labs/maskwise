import { config } from 'dotenv';

// Load environment variables
config();

export const Config = {
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  // SECURITY: Validate Redis authentication in production
  _validateRedisAuth() {
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_PASSWORD) {
      throw new Error(
        'CRITICAL SECURITY ERROR: REDIS_PASSWORD is required in production. ' +
        'Unauthenticated Redis instances expose sensitive data to network attackers. ' +
        'Set REDIS_PASSWORD environment variable with a strong password (minimum 16 characters).'
      );
    }
  },

  // Database configuration  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://maskwise:maskwise_dev_password@localhost:5432/maskwise',
  },

  // Presidio services
  presidio: {
    analyzerUrl: process.env.PRESIDIO_ANALYZER_URL || 'http://localhost:5003',
    anonymizerUrl: process.env.PRESIDIO_ANONYMIZER_URL || 'http://localhost:5004',
  },

  // Text extraction services
  extraction: {
    tikaUrl: process.env.TIKA_URL || 'http://localhost:9998',
    tesseractUrl: process.env.TESSERACT_URL || 'http://localhost:8884',
  },

  // File storage
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    outputDir: process.env.OUTPUT_DIR || './storage',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
  },

  // Worker configuration
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
    retryAttempts: parseInt(process.env.WORKER_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.WORKER_RETRY_DELAY || '5000'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
} as const;