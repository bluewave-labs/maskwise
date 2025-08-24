import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportBuilderController } from './report-builder.controller';
import { ReportBuilderService } from './report-builder.service';

@Module({
  controllers: [ReportsController, ReportBuilderController],
  providers: [ReportsService, ReportBuilderService],
  exports: [ReportsService, ReportBuilderService],
})
export class ReportsModule {}