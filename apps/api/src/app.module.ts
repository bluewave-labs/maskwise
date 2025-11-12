import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ProjectsModule } from './projects/projects.module';
import { PoliciesModule } from './policies/policies.module';
import { JobsModule } from './jobs/jobs.module';
import { ReportsModule } from './reports/reports.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { SystemModule } from './system/system.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './common/database.module';
import { V1Module } from './v1/v1.module';
import { SSEModule } from './sse/sse.module';
import { NotificationsModule } from './notifications/notifications.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    DatasetsModule,
    ProjectsModule,
    PoliciesModule,
    JobsModule,
    ReportsModule,
    ApiKeysModule,
    SystemModule,
    HealthModule,
    SSEModule,
    NotificationsModule,
    V1Module,
  ],
})
export class AppModule {}