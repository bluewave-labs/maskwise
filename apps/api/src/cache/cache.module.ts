import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Cache Module
 *
 * Provides Redis caching functionality globally across the application.
 * Marked as @Global() to avoid importing in every module that needs caching.
 *
 * @since 1.0.0
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
