import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberAccess } from '../auth/decorators/roles.decorator';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { PIIAnalysisQueryDto } from './dto/pii-analysis-query.dto';
import { ComplianceQueryDto } from './dto/compliance-query.dto';

/**
 * Reports Controller
 * 
 * Handles generation of various reports and analytics for the dashboard.
 * All endpoints require JWT authentication and implement proper caching
 * for performance optimization.
 */

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@MemberAccess() // Both admin and members can access reports
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @ApiOperation({ 
    summary: 'Get overview dashboard data',
    description: `
      Returns comprehensive overview data for the reports dashboard including:
      - Key metrics (datasets, findings, compliance score, high-risk files)
      - Processing trends over time
      - PII distribution by entity type
      - Recent high-risk findings
      
      Supports flexible date filtering with predefined ranges or custom dates.
      All data is scoped to the authenticated user's projects and datasets.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Overview data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          properties: {
            totalDatasets: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Total Datasets' },
                value: { type: 'number', example: 156 },
                change: { type: 'number', example: 12 },
                trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' },
                changeLabel: { type: 'string', example: 'vs previous period' },
              },
            },
            totalFindings: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'PII Entities Found' },
                value: { type: 'number', example: 1247 },
                change: { type: 'number', example: -5 },
                trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'down' },
                changeLabel: { type: 'string', example: 'vs previous period' },
              },
            },
            highRiskFiles: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'High-Risk Files' },
                value: { type: 'number', example: 23 },
                change: { type: 'number', example: -15 },
                trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' },
                changeLabel: { type: 'string', example: 'vs previous period' },
              },
            },
            complianceScore: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Compliance Score' },
                value: { type: 'number', example: 87 },
                change: { type: 'number', example: 3 },
                trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' },
                changeLabel: { type: 'string', example: 'vs previous period' },
              },
            },
          },
        },
        processingTrends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2025-08-24' },
              datasets: { type: 'number', example: 15 },
              findings: { type: 'number', example: 127 },
            },
          },
        },
        piiDistribution: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityType: { type: 'string', example: 'EMAIL_ADDRESS' },
              count: { type: 'number', example: 456 },
              percentage: { type: 'number', example: 36.5 },
              riskLevel: { type: 'string', enum: ['high', 'medium', 'low'], example: 'medium' },
            },
          },
        },
        recentHighRiskFindings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              datasetId: { type: 'string' },
              datasetName: { type: 'string', example: 'customer-data.csv' },
              entityType: { type: 'string', example: 'SSN' },
              confidence: { type: 'number', example: 0.95 },
              riskLevel: { type: 'string', enum: ['high', 'medium', 'low'], example: 'high' },
              createdAt: { type: 'string', format: 'date-time' },
              projectName: { type: 'string', example: 'Customer Analytics' },
            },
          },
        },
        dateRange: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token' 
  })
  async getOverview(
    @Query() query: OverviewQueryDto,
    @Request() req,
  ) {
    const data = await this.reportsService.getOverviewData(req.user.id, query);
    
    return {
      success: true,
      data,
      meta: {
        generatedAt: new Date().toISOString(),
        userId: req.user.id,
        query: {
          range: query.range || '7d',
          startDate: data.dateRange.startDate.toISOString(),
          endDate: data.dateRange.endDate.toISOString(),
        },
      },
    };
  }

  @Get('pii-analysis')
  @ApiOperation({ 
    summary: 'Get detailed PII analysis data',
    description: `
      Returns comprehensive PII detection analysis data including:
      - Entity type breakdown with confidence levels
      - Confidence distribution across findings
      - File type analysis with PII density metrics
      - Detection performance and extraction method effectiveness
      - Job performance statistics and error analysis
      
      Supports flexible filtering by entity type, file type, and date range.
      All data is scoped to the authenticated user's projects and datasets.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'PII analysis data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        entityBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityType: { type: 'string', example: 'EMAIL_ADDRESS' },
              count: { type: 'number', example: 145 },
              percentage: { type: 'number', example: 23.5 },
              avgConfidence: { type: 'number', example: 0.89 },
              riskLevel: { type: 'string', enum: ['high', 'medium', 'low'], example: 'medium' },
            },
          },
        },
        confidenceDistribution: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              range: { type: 'string', example: '0.8-0.9' },
              label: { type: 'string', example: 'High (80-90%)' },
              count: { type: 'number', example: 234 },
              percentage: { type: 'number', example: 45.2 },
              entityTypes: { type: 'number', example: 8 },
            },
          },
        },
        fileTypeAnalysis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fileType: { type: 'string', example: 'PDF' },
              datasetCount: { type: 'number', example: 15 },
              findingsCount: { type: 'number', example: 127 },
              totalSizeMB: { type: 'number', example: 45.6 },
              piiDensity: { type: 'number', example: 2.78 },
              avgFindingsPerFile: { type: 'number', example: 8.47 },
            },
          },
        },
        detectionPerformance: {
          type: 'object',
          properties: {
            totalDatasets: { type: 'number', example: 156 },
            successfulJobs: { type: 'number', example: 148 },
            failedJobs: { type: 'number', example: 8 },
            successRate: { type: 'number', example: 95 },
            avgProcessingTimeMs: { type: 'number', example: 2340 },
            extractionMethods: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  method: { type: 'string', example: 'tika' },
                  count: { type: 'number', example: 67 },
                  avgConfidence: { type: 'number', example: 87.5 },
                  successRate: { type: 'number', example: 96 },
                },
              },
            },
          },
        },
        jobPerformance: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              jobType: { type: 'string', example: 'ANALYZE_PII' },
              totalJobs: { type: 'number', example: 156 },
              completed: { type: 'number', example: 148 },
              failed: { type: 'number', example: 8 },
              running: { type: 'number', example: 0 },
              queued: { type: 'number', example: 0 },
              successRate: { type: 'number', example: 95 },
              avgProcessingTimeMs: { type: 'number', example: 2340 },
              commonErrors: {
                type: 'object',
                additionalProperties: { type: 'number' },
                example: { 'Connection timeout': 3, 'Invalid file format': 2 },
              },
            },
          },
        },
        dateRange: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token' 
  })
  async getPIIAnalysis(
    @Query() query: PIIAnalysisQueryDto,
    @Request() req,
  ) {
    const data = await this.reportsService.getPIIAnalysisData(req.user.id, query);
    
    return {
      success: true,
      data,
      meta: {
        generatedAt: new Date().toISOString(),
        userId: req.user.id,
        query: {
          range: query.range || '7d',
          entityType: query.entityType || null,
          fileType: query.fileType || null,
          projectId: query.projectId || null,
          startDate: data.dateRange.startDate.toISOString(),
          endDate: data.dateRange.endDate.toISOString(),
        },
      },
    };
  }

  @Get('compliance')
  @ApiOperation({ 
    summary: 'Get comprehensive compliance and risk assessment data',
    description: `
      Returns comprehensive compliance and risk data including:
      - Compliance metrics (processing coverage, policy coverage, high-risk findings)
      - Policy effectiveness analysis with scoring
      - Audit trail with user activity tracking
      - Data retention metrics and compliance status
      - Risk assessment with actionable recommendations
      
      Supports filtering by date range, policy name, and audit actions.
      All data is scoped to the authenticated user's projects and datasets.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Compliance data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            metrics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Processing Coverage' },
                  value: { type: 'number', example: 95 },
                  target: { type: 'number', example: 95 },
                  status: { type: 'string', enum: ['compliant', 'warning', 'violation'], example: 'compliant' },
                  trend: { type: 'string', enum: ['up', 'down', 'stable'], example: 'stable' },
                  description: { type: 'string', example: 'Percentage of datasets successfully processed' }
                }
              }
            },
            policyEffectiveness: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  policyId: { type: 'string', example: 'cm123456789' },
                  policyName: { type: 'string', example: 'GDPR Compliance' },
                  version: { type: 'string', example: '1.0.0' },
                  isActive: { type: 'boolean', example: true },
                  appliedDatasets: { type: 'number', example: 25 },
                  totalFindings: { type: 'number', example: 150 },
                  highRiskFindings: { type: 'number', example: 5 },
                  effectivenessScore: { type: 'number', example: 96 },
                  lastApplied: { type: 'string', format: 'date-time' }
                }
              }
            },
            auditTrail: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'cm123456789' },
                  action: { type: 'string', example: 'DATASET_CREATED' },
                  userId: { type: 'string', example: 'cm123456789' },
                  userEmail: { type: 'string', example: 'admin@maskwise.com' },
                  ipAddress: { type: 'string', example: '192.168.1.1' },
                  userAgent: { type: 'string', example: 'Mozilla/5.0...' },
                  details: { type: 'object' },
                  timestamp: { type: 'string', format: 'date-time' },
                  resourceType: { type: 'string', example: 'Dataset' },
                  resourceId: { type: 'string', example: 'cm123456789' }
                }
              }
            },
            dataRetention: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string', example: 'Dataset Records' },
                  totalRecords: { type: 'number', example: 100 },
                  dueForDeletion: { type: 'number', example: 5 },
                  deletedRecords: { type: 'number', example: 10 },
                  retentionPeriod: { type: 'string', example: '2 years' },
                  complianceStatus: { type: 'string', enum: ['compliant', 'warning', 'violation'], example: 'compliant' }
                }
              }
            },
            riskAssessment: {
              type: 'object',
              properties: {
                riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'low' },
                score: { type: 'number', example: 85 },
                factors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Processing Backlog' },
                      weight: { type: 'number', example: 0.3 },
                      score: { type: 'number', example: 95 },
                      description: { type: 'string', example: '2 datasets pending processing out of 50' }
                    }
                  }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Continue current compliance practices', 'Regular monitoring and review cycles']
                }
              }
            },
            dateRange: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            userId: { type: 'string' },
            query: {
              type: 'object',
              properties: {
                range: { type: 'string' },
                policyName: { type: 'string' },
                action: { type: 'string' },
                projectId: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getComplianceData(
    @Query() query: ComplianceQueryDto,
    @Request() req,
  ) {
    const data = await this.reportsService.getComplianceData(req.user.id, query);
    
    return {
      success: true,
      data,
      meta: {
        generatedAt: new Date().toISOString(),
        userId: req.user.id,
        query: {
          range: query.range || '7d',
          policyName: query.policyName || null,
          action: query.action || null,
          projectId: query.projectId || null,
          startDate: data.dateRange.startDate.toISOString(),
          endDate: data.dateRange.endDate.toISOString(),
        },
      },
    };
  }
}