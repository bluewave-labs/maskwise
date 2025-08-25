import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate Limiting Decorators
 * 
 * Convenient decorators for applying different rate limiting strategies
 * to controllers and endpoints.
 */

export const RATE_LIMIT_KEY = 'rate_limit_config';

export interface RateLimitConfig {
  points: number;    // Number of requests
  duration: number;  // Time window in seconds
  blockDuration?: number; // Block duration in seconds (default: same as duration)
  message?: string;  // Custom error message
}

/**
 * Apply custom rate limiting to an endpoint
 */
export const RateLimit = (config: RateLimitConfig) => {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, config),
    UseGuards(ThrottlerGuard),
  );
};

/**
 * Strict rate limiting for sensitive endpoints (auth, admin actions)
 * 5 requests per minute
 */
export const StrictRateLimit = () => {
  return RateLimit({
    points: 5,
    duration: 60,
    blockDuration: 300, // 5 minute block
    message: 'Too many attempts. Please try again in a few minutes.',
  });
};

/**
 * Moderate rate limiting for regular API endpoints
 * 100 requests per minute
 */
export const ModerateRateLimit = () => {
  return RateLimit({
    points: 100,
    duration: 60,
    message: 'Rate limit exceeded. Please slow down your requests.',
  });
};

/**
 * Generous rate limiting for public/read endpoints
 * 500 requests per minute
 */
export const GenerousRateLimit = () => {
  return RateLimit({
    points: 500,
    duration: 60,
    message: 'Rate limit exceeded.',
  });
};

/**
 * API key rate limiting for programmatic access
 * 1000 requests per minute, 10000 per hour
 */
export const ApiKeyRateLimit = () => {
  return RateLimit({
    points: 1000,
    duration: 60,
    message: 'API rate limit exceeded. Please check your usage.',
  });
};

/**
 * File upload rate limiting
 * 10 uploads per minute
 */
export const UploadRateLimit = () => {
  return RateLimit({
    points: 10,
    duration: 60,
    blockDuration: 60,
    message: 'Upload rate limit exceeded. Please wait before uploading more files.',
  });
};

/**
 * Heavy operation rate limiting (reports, exports)
 * 5 requests per minute
 */
export const HeavyOperationRateLimit = () => {
  return RateLimit({
    points: 5,
    duration: 60,
    blockDuration: 60,
    message: 'Heavy operation rate limit exceeded. Please wait before trying again.',
  });
};

/**
 * Authentication rate limiting with progressive penalties
 * 5 attempts per minute, 20 per hour
 */
export const AuthRateLimit = () => {
  return RateLimit({
    points: 5,
    duration: 60,
    blockDuration: 900, // 15 minute block after limit
    message: 'Too many authentication attempts. Please try again later.',
  });
};