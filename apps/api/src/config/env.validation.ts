import * as Joi from 'joi';

/**
 * Environment Variable Validation Schema
 *
 * Validates all required environment variables at application startup.
 * Application will fail to start if required variables are missing or invalid.
 *
 * Security Features:
 * - Enforces strong JWT secrets (minimum 32 characters)
 * - Validates NODE_ENV to prevent accidental production misconfiguration
 * - Requires database and Redis URLs for proper service connectivity
 * - Validates external service URLs format
 *
 * @see {@link https://github.com/sideway/joi/blob/master/API.md Joi API Documentation}
 */
export const validationSchema = Joi.object({
  // ===========================================
  // Node Environment
  // ===========================================
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment'),

  // ===========================================
  // Application Configuration
  // ===========================================
  PORT: Joi.number()
    .port()
    .default(3001)
    .description('API server port'),

  // ===========================================
  // JWT Configuration (CRITICAL SECURITY)
  // ===========================================
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .invalid('maskwise_jwt_secret_dev_only') // SECURITY: Block known development default in production
    .description('JWT signing secret - MUST be at least 32 characters and NOT use development defaults'),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .invalid(Joi.ref('JWT_SECRET'), 'maskwise_jwt_refresh_secret_dev_only') // Block both duplicate and dev default
    .description('JWT refresh token secret - MUST be different from JWT_SECRET and NOT use development defaults'),

  // ===========================================
  // Database Configuration
  // ===========================================
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required()
    .description('PostgreSQL database connection URL'),

  // ===========================================
  // Redis Configuration
  // ===========================================
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required()
    .description('Redis connection URL'),

  // ===========================================
  // External Services (Required for PII processing)
  // ===========================================
  PRESIDIO_ANALYZER_URL: Joi.string()
    .uri()
    .required()
    .description('Presidio Analyzer service URL'),

  PRESIDIO_ANONYMIZER_URL: Joi.string()
    .uri()
    .required()
    .description('Presidio Anonymizer service URL'),

  TIKA_URL: Joi.string()
    .uri()
    .required()
    .description('Apache Tika service URL'),

  TESSERACT_URL: Joi.string()
    .uri()
    .required()
    .description('Tesseract OCR service URL'),

  // ===========================================
  // Frontend Configuration
  // ===========================================
  FRONTEND_URL: Joi.string()
    .uri()
    .optional()
    .description('Frontend URL for CORS configuration'),

  // ===========================================
  // Default Admin Credentials (Optional)
  // ===========================================
  DEFAULT_ADMIN_EMAIL: Joi.string()
    .email()
    .optional()
    .default('admin@maskwise.com')
    .description('Default admin user email'),

  DEFAULT_ADMIN_PASSWORD: Joi.string()
    .min(8)
    .optional()
    .default('admin123')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .min(12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .invalid('admin123', 'password', 'Password123!', 'Admin123!') // SECURITY: Block common weak defaults
        .messages({
          'any.invalid': 'DEFAULT_ADMIN_PASSWORD cannot use common weak passwords in production'
        }),
      otherwise: Joi.string().min(8)
    })
    .description('Default admin password - MUST be strong and NOT use common defaults in production'),

  // ===========================================
  // Storage Configuration
  // ===========================================
  UPLOAD_DIR: Joi.string()
    .optional()
    .default('./uploads')
    .description('Directory for uploaded files'),

  STORAGE_DIR: Joi.string()
    .optional()
    .default('./storage')
    .description('Directory for processed files'),

  // ===========================================
  // Worker Configuration
  // ===========================================
  WORKER_CONCURRENCY: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .default(2)
    .description('Number of concurrent worker processes'),

  // ===========================================
  // Logging Configuration
  // ===========================================
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .optional()
    .default('info')
    .description('Application log level'),

  // ===========================================
  // File Upload Limits
  // ===========================================
  MAX_FILE_SIZE: Joi.number()
    .integer()
    .min(1024 * 1024) // Minimum 1MB
    .max(1024 * 1024 * 1024) // Maximum 1GB
    .optional()
    .default(100 * 1024 * 1024) // Default 100MB
    .description('Maximum file upload size in bytes'),

  // ===========================================
  // CORS Configuration
  // ===========================================
  CORS_ORIGINS: Joi.string()
    .optional()
    .description('Comma-separated list of allowed CORS origins'),
});

/**
 * Validates environment variables and provides helpful error messages
 *
 * @param config - Raw environment variables object
 * @returns Validated and transformed environment variables
 * @throws Error with detailed message if validation fails
 */
export function validate(config: Record<string, unknown>) {
  const { error, value } = validationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true, // Allow other env vars for system/OS variables
  });

  if (error) {
    const missingVars = error.details
      .filter(detail => detail.type === 'any.required')
      .map(detail => detail.context?.label)
      .join(', ');

    const invalidVars = error.details
      .filter(detail => detail.type !== 'any.required')
      .map(detail => `${detail.context?.label}: ${detail.message}`)
      .join('\n  ');

    let errorMessage = '\n🚨 ENVIRONMENT VALIDATION FAILED 🚨\n\n';

    if (missingVars) {
      errorMessage += `Missing required variables:\n  ${missingVars}\n\n`;
    }

    if (invalidVars) {
      errorMessage += `Invalid variable values:\n  ${invalidVars}\n\n`;
    }

    errorMessage += 'Please check your .env file and ensure all required variables are set correctly.\n';
    errorMessage += 'Refer to .env.example for required configuration.\n';

    throw new Error(errorMessage);
  }

  return value;
}
