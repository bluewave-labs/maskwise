import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { HealthMonitorService } from './services/health-monitor.service';

@Module({
  controllers: [SystemController],
  providers: [SystemService, HealthMonitorService],
  exports: [SystemService, HealthMonitorService],
})
export class SystemModule {}