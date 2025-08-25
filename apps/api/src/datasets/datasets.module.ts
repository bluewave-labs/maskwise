import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { QueueModule } from '../queue/queue.module';
import { SecurityModule } from './security/security.module';
import { SSEModule } from '../sse/sse.module';

@Module({
  imports: [QueueModule, SecurityModule, SSEModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}