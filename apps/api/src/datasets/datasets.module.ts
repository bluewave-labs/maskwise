import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { QueueModule } from '../queue/queue.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [QueueModule, SecurityModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}