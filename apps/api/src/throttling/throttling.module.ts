import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdvancedThrottlerService } from './advanced-throttler.service';
import { RateLimitInterceptor } from './rate-limit.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 100, // 100 requests per minute (fallback)
          },
          {
            name: 'strict',
            ttl: 60000, // 1 minute
            limit: 20,  // 20 requests per minute (for sensitive endpoints)
          },
        ],
        storage: undefined, // Use default in-memory storage for now
      }),
    }),
  ],
  providers: [
    AdvancedThrottlerService,
    RateLimitInterceptor,
  ],
  exports: [
    AdvancedThrottlerService,
    RateLimitInterceptor,
    ThrottlerModule,
  ],
})
export class ThrottlingModule {}