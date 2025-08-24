import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../common/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, PrismaService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}