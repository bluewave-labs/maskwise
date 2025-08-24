import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ReportBuilderService } from './report-builder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberAccess } from '../auth/decorators/roles.decorator';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { GenerateReportDto } from './dto/generate-report.dto';

/**
 * Report Builder Controller
 * 
 * Handles custom report template creation, management, and generation.
 * Users can create custom report layouts with drag-drop components,
 * save templates, and generate PDF reports with their custom layouts.
 */

@ApiTags('Report Builder')
@Controller('reports/builder')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@MemberAccess() // Both admin and members can access report builder
export class ReportBuilderController {
  constructor(private readonly reportBuilderService: ReportBuilderService) {}

  @Get('data-sources')
  @ApiOperation({ 
    summary: 'Get available data sources for report builder',
    description: `
      Returns all available data sources that can be used in custom reports:
      - Overview metrics and charts
      - PII analysis components
      - Compliance and risk assessment data
      
      Each data source includes metadata about the component type, data requirements,
      and available visualization options.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Data sources retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            overview: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'overview-metrics' },
                  name: { type: 'string', example: 'Overview Metrics' },
                  description: { type: 'string', example: 'Key performance metrics' },
                  category: { type: 'string', example: 'overview' },
                  componentType: { type: 'string', example: 'metrics-cards' },
                  dataFields: { type: 'array', items: { type: 'string' } },
                  visualizationOptions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            piiAnalysis: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'entity-breakdown' },
                  name: { type: 'string', example: 'Entity Type Breakdown' },
                  description: { type: 'string', example: 'PII entity distribution' },
                  category: { type: 'string', example: 'pii-analysis' },
                  componentType: { type: 'string', example: 'donut-chart' },
                  dataFields: { type: 'array', items: { type: 'string' } },
                  visualizationOptions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            compliance: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'compliance-metrics' },
                  name: { type: 'string', example: 'Compliance Metrics' },
                  description: { type: 'string', example: 'Compliance scores and status' },
                  category: { type: 'string', example: 'compliance' },
                  componentType: { type: 'string', example: 'gauge-chart' },
                  dataFields: { type: 'array', items: { type: 'string' } },
                  visualizationOptions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  })
  async getDataSources(@Request() req) {
    const dataSources = await this.reportBuilderService.getAvailableDataSources();
    return {
      success: true,
      data: dataSources,
    };
  }

  @Get('templates')
  @ApiOperation({ 
    summary: 'Get user report templates',
    description: 'Returns all report templates created by the authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string', example: 'Monthly PII Analysis' },
              description: { type: 'string', example: 'Comprehensive monthly review' },
              layout: { type: 'object' },
              isDefault: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getUserTemplates(@Request() req, @Query('page') page = '1', @Query('limit') limit = '10') {
    const templates = await this.reportBuilderService.getUserTemplates(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
    return {
      success: true,
      data: templates,
    };
  }

  @Post('templates')
  @ApiOperation({ 
    summary: 'Create new report template',
    description: 'Creates a new custom report template with drag-drop layout configuration'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Template created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            layout: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async createTemplate(@Body() createDto: CreateReportTemplateDto, @Request() req) {
    const template = await this.reportBuilderService.createTemplate(req.user.id, createDto);
    return {
      success: true,
      data: template,
    };
  }

  @Put('templates/:id')
  @ApiOperation({ 
    summary: 'Update report template',
    description: 'Updates an existing report template layout and configuration'
  })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateReportTemplateDto,
    @Request() req
  ) {
    const template = await this.reportBuilderService.updateTemplate(req.user.id, id, updateDto);
    return {
      success: true,
      data: template,
    };
  }

  @Delete('templates/:id')
  @ApiOperation({ 
    summary: 'Delete report template',
    description: 'Deletes a user report template'
  })
  async deleteTemplate(@Param('id') id: string, @Request() req) {
    await this.reportBuilderService.deleteTemplate(req.user.id, id);
    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  @Post('generate')
  @ApiOperation({ 
    summary: 'Generate custom report',
    description: `
      Generates a custom report using a template or custom layout configuration.
      Supports both JSON and PDF output formats.
      
      The generated report includes:
      - All data components specified in the layout
      - Custom styling and branding
      - Professional PDF formatting (if format=pdf)
      - Metadata about generation time and parameters
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Report generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            reportId: { type: 'string' },
            format: { type: 'string', enum: ['json', 'pdf'] },
            downloadUrl: { type: 'string', example: '/reports/download/abc123' },
            generatedAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' },
            metadata: {
              type: 'object',
              properties: {
                templateId: { type: 'string' },
                templateName: { type: 'string' },
                componentCount: { type: 'number' },
                dataRange: { type: 'object' },
              },
            },
          },
        },
      },
    },
  })
  async generateReport(@Body() generateDto: GenerateReportDto, @Request() req) {
    const report = await this.reportBuilderService.generateReport(req.user.id, generateDto);
    return {
      success: true,
      data: report,
    };
  }

  @Get('download/:reportId')
  @ApiOperation({ 
    summary: 'Download generated report',
    description: 'Downloads a previously generated report file (PDF or JSON)'
  })
  async downloadReport(@Param('reportId') reportId: string, @Request() req) {
    return this.reportBuilderService.downloadReport(req.user.id, reportId);
  }

  @Get('templates/default')
  @ApiOperation({ 
    summary: 'Get default report templates',
    description: 'Returns pre-built report templates for common use cases'
  })
  async getDefaultTemplates() {
    const templates = await this.reportBuilderService.getDefaultTemplates();
    return {
      success: true,
      data: templates,
    };
  }
}