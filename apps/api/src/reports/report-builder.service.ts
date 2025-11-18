import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ReportsService } from './reports.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { GenerateReportDto, ReportFormat } from './dto/generate-report.dto';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async getAvailableDataSources() {
    return {
      overview: [
        {
          id: 'overview-metrics',
          name: 'Overview Metrics',
          description: 'Key performance indicators and statistics',
          category: 'overview',
          componentType: 'metrics-cards',
          dataFields: ['totalDatasets', 'totalFindings', 'highRiskFiles', 'complianceScore'],
          visualizationOptions: ['cards', 'table', 'list'],
        },
        {
          id: 'processing-trends',
          name: 'Processing Trends',
          description: 'Dataset and findings processing over time',
          category: 'overview',
          componentType: 'line-chart',
          dataFields: ['date', 'datasets', 'findings'],
          visualizationOptions: ['line-chart', 'area-chart', 'bar-chart'],
        },
        {
          id: 'pii-distribution',
          name: 'PII Distribution',
          description: 'Distribution of PII entities found',
          category: 'overview',
          componentType: 'donut-chart',
          dataFields: ['entityType', 'count', 'percentage', 'riskLevel'],
          visualizationOptions: ['donut-chart', 'pie-chart', 'bar-chart', 'table'],
        },
        {
          id: 'recent-high-risk',
          name: 'Recent High-Risk Findings',
          description: 'Latest high-risk PII findings',
          category: 'overview',
          componentType: 'table',
          dataFields: ['datasetName', 'entityType', 'confidence', 'riskLevel', 'createdAt'],
          visualizationOptions: ['table', 'list', 'cards'],
        },
      ],
      piiAnalysis: [
        {
          id: 'entity-breakdown',
          name: 'Entity Type Breakdown',
          description: 'Detailed breakdown of detected PII entities',
          category: 'pii-analysis',
          componentType: 'donut-chart',
          dataFields: ['entityType', 'count', 'percentage', 'avgConfidence', 'riskLevel'],
          visualizationOptions: ['donut-chart', 'bar-chart', 'table'],
        },
        {
          id: 'confidence-distribution',
          name: 'Confidence Distribution',
          description: 'Distribution of confidence scores across findings',
          category: 'pii-analysis',
          componentType: 'histogram',
          dataFields: ['range', 'label', 'count', 'percentage', 'entityTypes'],
          visualizationOptions: ['histogram', 'bar-chart', 'table'],
        },
        {
          id: 'file-type-analysis',
          name: 'File Type Analysis',
          description: 'PII density and findings by file type',
          category: 'pii-analysis',
          componentType: 'bar-chart',
          dataFields: ['fileType', 'datasetCount', 'findingsCount', 'piiDensity'],
          visualizationOptions: ['bar-chart', 'table', 'bubble-chart'],
        },
        {
          id: 'detection-performance',
          name: 'Detection Performance',
          description: 'Success rates and performance metrics',
          category: 'pii-analysis',
          componentType: 'metrics-dashboard',
          dataFields: ['totalDatasets', 'successfulJobs', 'failedJobs', 'successRate'],
          visualizationOptions: ['dashboard', 'gauge-chart', 'table'],
        },
      ],
      compliance: [
        {
          id: 'compliance-metrics',
          name: 'Compliance Metrics',
          description: 'Compliance scores and status indicators',
          category: 'compliance',
          componentType: 'metrics-dashboard',
          dataFields: ['name', 'value', 'target', 'status', 'trend'],
          visualizationOptions: ['dashboard', 'gauge-chart', 'progress-bars'],
        },
        {
          id: 'policy-effectiveness',
          name: 'Policy Effectiveness',
          description: 'Policy performance and application metrics',
          category: 'compliance',
          componentType: 'table',
          dataFields: ['policyName', 'appliedDatasets', 'totalFindings', 'effectivenessScore'],
          visualizationOptions: ['table', 'bar-chart', 'cards'],
        },
        {
          id: 'audit-trail',
          name: 'Audit Trail',
          description: 'Recent user actions and system events',
          category: 'compliance',
          componentType: 'timeline',
          dataFields: ['action', 'userEmail', 'timestamp', 'resource'],
          visualizationOptions: ['timeline', 'table', 'list'],
        },
        {
          id: 'risk-assessment',
          name: 'Risk Assessment',
          description: 'Overall risk level and contributing factors',
          category: 'compliance',
          componentType: 'risk-dashboard',
          dataFields: ['riskLevel', 'score', 'factors', 'recommendations'],
          visualizationOptions: ['risk-dashboard', 'gauge-chart', 'factor-analysis'],
        },
      ],
    };
  }

  async getUserTemplates(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.prisma.reportTemplate.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          layout: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.reportTemplate.count({
        where: { userId },
      }),
    ]);

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createTemplate(userId: string, createDto: CreateReportTemplateDto) {
    // If this is set as default, unset existing default
    if (createDto.isDefault) {
      await this.prisma.reportTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await this.prisma.reportTemplate.create({
      data: {
        userId,
        name: createDto.name,
        description: createDto.description,
        layout: createDto.layout as any,
        isDefault: createDto.isDefault || false,
        tags: createDto.tags || [],
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REPORT_TEMPLATE_CREATED' as any,
        resource: 'ReportTemplate',
        resourceId: template.id,
        details: { templateName: template.name },
        ipAddress: '', // Will be set by middleware if available
        userAgent: '', // Will be set by middleware if available
      },
    });

    return template;
  }

  async updateTemplate(userId: string, templateId: string, updateDto: UpdateReportTemplateDto) {
    const existingTemplate = await this.prisma.reportTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!existingTemplate) {
      throw new NotFoundException('Report template not found');
    }

    // If setting as default, unset existing default
    if (updateDto.isDefault && !existingTemplate.isDefault) {
      await this.prisma.reportTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await this.prisma.reportTemplate.update({
      where: { id: templateId },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description !== undefined && { description: updateDto.description }),
        ...(updateDto.layout && { layout: updateDto.layout as any }),
        ...(updateDto.isDefault !== undefined && { isDefault: updateDto.isDefault }),
        ...(updateDto.tags && { tags: updateDto.tags }),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REPORT_TEMPLATE_UPDATED' as any,
        resource: 'ReportTemplate',
        resourceId: template.id,
        details: { templateName: template.name, changes: Object.keys(updateDto) },
        ipAddress: '',
        userAgent: '',
      },
    });

    return template;
  }

  async deleteTemplate(userId: string, templateId: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      throw new NotFoundException('Report template not found');
    }

    await this.prisma.reportTemplate.delete({
      where: { id: templateId },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REPORT_TEMPLATE_DELETED' as any,
        resource: 'ReportTemplate',
        resourceId: templateId,
        details: { templateName: template.name },
        ipAddress: '',
        userAgent: '',
      },
    });
  }

  async generateReport(userId: string, generateDto: GenerateReportDto) {
    let layout;
    let templateName = 'Custom Report';

    // Get layout from template or use custom layout
    if (generateDto.templateId) {
      const template = await this.prisma.reportTemplate.findFirst({
        where: { id: generateDto.templateId, userId },
      });

      if (!template) {
        throw new NotFoundException('Report template not found');
      }

      layout = template.layout;
      templateName = template.name;
    } else if (generateDto.customLayout) {
      layout = generateDto.customLayout;
    } else {
      throw new BadRequestException('Either templateId or customLayout must be provided');
    }

    // Generate report ID and create directory
    const reportId = uuidv4();
    const reportsDir = path.join(process.cwd(), 'storage', 'reports');
    await fs.promises.mkdir(reportsDir, { recursive: true });

    // Collect data for all components
    const reportData = await this.collectReportData(userId, layout, generateDto.filters || {});

    // Generate report based on format
    let filePath: string;
    let fileName: string;

    if (generateDto.format === ReportFormat.PDF) {
      fileName = `${reportId}.pdf`;
      filePath = path.join(reportsDir, fileName);
      await this.generatePDFReport(reportData, layout, generateDto.title || templateName, filePath);
    } else {
      fileName = `${reportId}.json`;
      filePath = path.join(reportsDir, fileName);
      await fs.promises.writeFile(filePath, JSON.stringify(reportData, null, 2));
    }

    // Store report record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    const reportRecord = await this.prisma.generatedReport.create({
      data: {
        id: reportId,
        userId,
        templateId: generateDto.templateId || null,
        templateName,
        title: generateDto.title || templateName,
        format: generateDto.format as any,
        filePath,
        fileName,
        expiresAt,
        metadata: {
          ...generateDto.metadata,
          componentCount: Array.isArray(layout.components) ? layout.components.length : 0,
          dataRange: generateDto.filters || {},
          generatedAt: new Date().toISOString(),
        } as any,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REPORT_GENERATED' as any,
        resource: 'GeneratedReport',
        resourceId: reportId,
        details: { 
          templateName,
          format: generateDto.format,
          componentCount: Array.isArray(layout.components) ? layout.components.length : 0,
        },
        ipAddress: '',
        userAgent: '',
      },
    });

    return {
      reportId,
      format: generateDto.format,
      downloadUrl: `/reports/builder/download/${reportId}`,
      generatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      metadata: reportRecord.metadata,
    };
  }

  async downloadReport(userId: string, reportId: string) {
    const report = await this.prisma.generatedReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (new Date() > report.expiresAt) {
      throw new BadRequestException('Report has expired');
    }

    if (!fs.existsSync(report.filePath)) {
      throw new NotFoundException('Report file not found');
    }

    return {
      filePath: report.filePath,
      fileName: report.fileName,
      contentType: report.format === 'PDF' ? 'application/pdf' : 'application/json',
    };
  }

  async getDefaultTemplates() {
    return [
      {
        id: 'comprehensive-overview',
        name: 'Comprehensive Overview',
        description: 'Complete overview with all key metrics and charts',
        layout: {
          grid: { columns: 12, rowHeight: 80, margin: [16, 16] },
          components: [
            { id: 'overview-metrics', type: 'metrics-cards', position: { x: 0, y: 0, width: 12, height: 2 } },
            { id: 'processing-trends', type: 'line-chart', position: { x: 0, y: 2, width: 6, height: 4 } },
            { id: 'pii-distribution', type: 'donut-chart', position: { x: 6, y: 2, width: 6, height: 4 } },
            { id: 'recent-high-risk', type: 'table', position: { x: 0, y: 6, width: 12, height: 4 } },
          ],
        },
      },
      {
        id: 'pii-analysis-focused',
        name: 'PII Analysis Focused',
        description: 'Detailed PII detection analysis and performance',
        layout: {
          grid: { columns: 12, rowHeight: 80, margin: [16, 16] },
          components: [
            { id: 'entity-breakdown', type: 'donut-chart', position: { x: 0, y: 0, width: 6, height: 4 } },
            { id: 'confidence-distribution', type: 'histogram', position: { x: 6, y: 0, width: 6, height: 4 } },
            { id: 'file-type-analysis', type: 'bar-chart', position: { x: 0, y: 4, width: 8, height: 4 } },
            { id: 'detection-performance', type: 'metrics-dashboard', position: { x: 8, y: 4, width: 4, height: 4 } },
          ],
        },
      },
      {
        id: 'compliance-dashboard',
        name: 'Compliance Dashboard',
        description: 'Compliance metrics, policies, and risk assessment',
        layout: {
          grid: { columns: 12, rowHeight: 80, margin: [16, 16] },
          components: [
            { id: 'compliance-metrics', type: 'metrics-dashboard', position: { x: 0, y: 0, width: 6, height: 3 } },
            { id: 'risk-assessment', type: 'risk-dashboard', position: { x: 6, y: 0, width: 6, height: 3 } },
            { id: 'policy-effectiveness', type: 'table', position: { x: 0, y: 3, width: 8, height: 4 } },
            { id: 'audit-trail', type: 'timeline', position: { x: 8, y: 3, width: 4, height: 4 } },
          ],
        },
      },
    ];
  }

  private async collectReportData(userId: string, layout: any, filters: any) {
    const data: any = {};

    if (!Array.isArray(layout.components)) {
      throw new BadRequestException('Invalid layout: components must be an array');
    }

    for (const component of layout.components) {
      try {
        const componentData = await this.getComponentData(userId, component.id, filters);
        data[component.id] = componentData;
      } catch (error) {
        this.logger.error(`Error collecting data for component ${component.id}`, error.stack);
        data[component.id] = { error: 'Failed to load data' };
      }
    }

    return data;
  }

  private async getComponentData(userId: string, componentId: string, filters: any) {
    const query = this.buildQueryFromFilters(filters);

    switch (componentId) {
      case 'overview-metrics':
      case 'processing-trends':
      case 'pii-distribution':
      case 'recent-high-risk':
        return this.reportsService.getOverviewData(userId, query);

      case 'entity-breakdown':
      case 'confidence-distribution':
      case 'file-type-analysis':
      case 'detection-performance':
        return this.reportsService.getPIIAnalysisData(userId, query);

      case 'compliance-metrics':
      case 'policy-effectiveness':
      case 'audit-trail':
      case 'risk-assessment':
        return this.reportsService.getComplianceData(userId, query);

      default:
        throw new BadRequestException(`Unknown component ID: ${componentId}`);
    }
  }

  private buildQueryFromFilters(filters: any) {
    return {
      range: filters.range || '7d',
      startDate: filters.startDate,
      endDate: filters.endDate,
      projectId: filters.projectId,
      entityType: filters.entityType,
      fileType: filters.fileType,
      policyName: filters.policyName,
    };
  }

  private async generatePDFReport(data: any, layout: any, title: string, filePath: string) {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Title page
    doc.fontSize(24).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.addPage();

    // Render each component
    for (const component of layout.components) {
      doc.fontSize(18).text(this.getComponentDisplayName(component.id));
      doc.moveDown();

      const componentData = data[component.id];
      if (componentData && !componentData.error) {
        await this.renderComponentToPDF(doc, component.id, componentData);
      } else {
        doc.fontSize(12).text('Data unavailable');
      }

      doc.addPage();
    }

    doc.end();

    return new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private getComponentDisplayName(componentId: string): string {
    const names: { [key: string]: string } = {
      'overview-metrics': 'Overview Metrics',
      'processing-trends': 'Processing Trends',
      'pii-distribution': 'PII Distribution',
      'recent-high-risk': 'Recent High-Risk Findings',
      'entity-breakdown': 'Entity Type Breakdown',
      'confidence-distribution': 'Confidence Distribution',
      'file-type-analysis': 'File Type Analysis',
      'detection-performance': 'Detection Performance',
      'compliance-metrics': 'Compliance Metrics',
      'policy-effectiveness': 'Policy Effectiveness',
      'audit-trail': 'Audit Trail',
      'risk-assessment': 'Risk Assessment',
    };
    return names[componentId] || componentId;
  }

  private async renderComponentToPDF(doc: any, componentId: string, data: any) {
    // Basic data rendering for PDF
    if (typeof data === 'object') {
      doc.fontSize(10).text(JSON.stringify(data, null, 2).substring(0, 1000));
    } else {
      doc.fontSize(12).text(String(data));
    }
    doc.moveDown();
  }
}