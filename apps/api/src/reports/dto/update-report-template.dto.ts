import { PartialType } from '@nestjs/swagger';
import { CreateReportTemplateDto } from './create-report-template.dto';

export class UpdateReportTemplateDto extends PartialType(CreateReportTemplateDto) {}