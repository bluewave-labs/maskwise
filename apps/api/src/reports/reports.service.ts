import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { PIIAnalysisQueryDto } from './dto/pii-analysis-query.dto';
import { ComplianceQueryDto } from './dto/compliance-query.dto';

export interface MetricCard {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  changeLabel: string;
}

export interface ProcessingTrend {
  date: string;
  datasets: number;
  findings: number;
}

export interface PIIDistribution {
  entityType: string;
  count: number;
  percentage: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface RecentHighRiskFinding {
  id: string;
  datasetId: string;
  datasetName: string;
  entityType: string;
  confidence: number;
  riskLevel: 'high' | 'medium' | 'low';
  createdAt: Date;
  projectName: string;
}

export interface OverviewData {
  metrics: {
    totalDatasets: MetricCard;
    totalFindings: MetricCard;
    highRiskFiles: MetricCard;
    complianceScore: MetricCard;
  };
  processingTrends: ProcessingTrend[];
  piiDistribution: PIIDistribution[];
  recentHighRiskFindings: RecentHighRiskFinding[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface EntityTypeBreakdown {
  entityType: string;
  count: number;
  percentage: number;
  avgConfidence: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface ConfidenceDistribution {
  range: string;
  label: string;
  count: number;
  percentage: number;
  entityTypes: number;
}

export interface FileTypeAnalysis {
  fileType: string;
  datasetCount: number;
  findingsCount: number;
  totalSizeMB: number;
  piiDensity: number;
  avgFindingsPerFile: number;
}

export interface DetectionPerformance {
  totalDatasets: number;
  successfulJobs: number;
  failedJobs: number;
  successRate: number;
  avgProcessingTimeMs: number;
  extractionMethods: {
    method: string;
    count: number;
    avgConfidence: number;
    successRate: number;
  }[];
}

export interface JobPerformanceStats {
  jobType: string;
  totalJobs: number;
  completed: number;
  failed: number;
  running: number;
  queued: number;
  successRate: number;
  avgProcessingTimeMs: number;
  commonErrors: Record<string, number>;
}

export interface PIIAnalysisData {
  entityBreakdown: EntityTypeBreakdown[];
  confidenceDistribution: ConfidenceDistribution[];
  fileTypeAnalysis: FileTypeAnalysis[];
  detectionPerformance: DetectionPerformance;
  jobPerformance: JobPerformanceStats[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface PolicyEffectiveness {
  policyId: string;
  policyName: string;
  version: string;
  isActive: boolean;
  appliedDatasets: number;
  totalFindings: number;
  highRiskFindings: number;
  effectivenessScore: number;
  lastApplied: Date;
}

export interface ComplianceMetric {
  name: string;
  value: number;
  target: number;
  status: 'compliant' | 'warning' | 'violation';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface AuditTrailEntry {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  timestamp: Date;
  resourceType: string;
  resourceId?: string;
}

export interface DataRetentionMetric {
  category: string;
  totalRecords: number;
  dueForDeletion: number;
  deletedRecords: number;
  retentionPeriod: string;
  complianceStatus: 'compliant' | 'warning' | 'violation';
}

export interface ComplianceRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: {
    name: string;
    weight: number;
    score: number;
    description: string;
  }[];
  recommendations: string[];
}

export interface ComplianceData {
  metrics: ComplianceMetric[];
  policyEffectiveness: PolicyEffectiveness[];
  auditTrail: AuditTrailEntry[];
  dataRetention: DataRetentionMetric[];
  riskAssessment: ComplianceRiskAssessment;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly db: PrismaService) {}

  async getOverviewData(userId: string, query: OverviewQueryDto): Promise<OverviewData> {
    const { startDate, endDate } = this.calculateDateRange(query);
    
    this.logger.log(`Generating overview report for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      // Execute all queries in parallel for better performance
      const [
        metrics,
        processingTrends,
        piiDistribution,
        recentHighRiskFindings,
      ] = await Promise.all([
        this.getMetrics(userId, startDate, endDate),
        this.getProcessingTrends(userId, startDate, endDate),
        this.getPIIDistribution(userId, startDate, endDate),
        this.getRecentHighRiskFindings(userId, 10),
      ]);

      return {
        metrics,
        processingTrends,
        piiDistribution,
        recentHighRiskFindings,
        dateRange: { startDate, endDate },
      };

    } catch (error) {
      this.logger.error(`Failed to generate overview report for user ${userId}`, {
        error: error.message,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      throw new Error('Failed to generate overview report');
    }
  }

  private calculateDateRange(query: OverviewQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else if (query.range) {
      endDate = now;
      switch (query.range) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date('2020-01-01'); // Far enough back to include all data
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Default to 7 days
      endDate = now;
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private async getMetrics(userId: string, startDate: Date, endDate: Date): Promise<OverviewData['metrics']> {
    // Current period metrics
    const [
      currentDatasets,
      currentFindings,
      currentHighRiskFiles,
      totalDatasets,
      totalFindings,
    ] = await Promise.all([
      // Datasets processed in current period
      this.db.dataset.count({
        where: {
          project: {
            userId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      
      // PII findings in current period
      this.db.finding.count({
        where: {
          dataset: { 
            project: { userId }
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      
      // High-risk files (datasets with high-risk PII)
      this.db.dataset.count({
        where: {
          project: {
            userId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          findings: {
            some: {
              entityType: {
                in: ['SSN', 'CREDIT_CARD', 'MEDICAL_LICENSE', 'US_PASSPORT'],
              },
            },
          },
        },
      }),
      
      // Total datasets (all time)
      this.db.dataset.count({
        where: { 
          project: { userId }
        },
      }),
      
      // Total findings (all time)
      this.db.finding.count({
        where: {
          dataset: { 
            project: { userId }
          },
        },
      }),
    ]);

    // Previous period for comparison (same duration as current period)
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodDuration);
    const prevEndDate = startDate;

    const [
      prevDatasets,
      prevFindings,
      prevHighRiskFiles,
    ] = await Promise.all([
      this.db.dataset.count({
        where: {
          project: {
            userId,
          },
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      }),
      
      this.db.finding.count({
        where: {
          dataset: { 
            project: { userId }
          },
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      }),
      
      this.db.dataset.count({
        where: {
          project: {
            userId,
          },
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
          findings: {
            some: {
              entityType: {
                in: ['SSN', 'CREDIT_CARD', 'MEDICAL_LICENSE', 'US_PASSPORT'],
              },
            },
          },
        },
      }),
    ]);

    // Calculate compliance score (simplified - could be more sophisticated)
    const complianceScore = Math.max(0, Math.min(100, 
      100 - (currentHighRiskFiles / Math.max(1, currentDatasets) * 50)
    ));
    
    const prevComplianceScore = Math.max(0, Math.min(100,
      100 - (prevHighRiskFiles / Math.max(1, prevDatasets) * 50)
    ));

    return {
      totalDatasets: {
        title: 'Total Datasets',
        value: totalDatasets,
        change: this.calculatePercentageChange(currentDatasets, prevDatasets),
        trend: this.calculateTrend(currentDatasets, prevDatasets),
        changeLabel: 'vs previous period',
      },
      totalFindings: {
        title: 'PII Entities Found',
        value: totalFindings,
        change: this.calculatePercentageChange(currentFindings, prevFindings),
        trend: this.calculateTrend(currentFindings, prevFindings),
        changeLabel: 'vs previous period',
      },
      highRiskFiles: {
        title: 'High-Risk Files',
        value: currentHighRiskFiles,
        change: this.calculatePercentageChange(currentHighRiskFiles, prevHighRiskFiles),
        trend: this.calculateTrend(currentHighRiskFiles, prevHighRiskFiles, true), // Inverted for risk
        changeLabel: 'vs previous period',
      },
      complianceScore: {
        title: 'Compliance Score',
        value: Math.round(complianceScore),
        change: this.calculatePercentageChange(complianceScore, prevComplianceScore),
        trend: this.calculateTrend(complianceScore, prevComplianceScore),
        changeLabel: 'vs previous period',
      },
    };
  }

  private async getProcessingTrends(userId: string, startDate: Date, endDate: Date): Promise<ProcessingTrend[]> {
    // Generate daily data points for the chart
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const trends: ProcessingTrend[] = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const [datasets, findings] = await Promise.all([
        this.db.dataset.count({
          where: {
            project: {
              userId,
            },
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
        
        this.db.finding.count({
          where: {
            dataset: { 
              project: { userId }
            },
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
      ]);

      trends.push({
        date: dayStart.toISOString().split('T')[0], // YYYY-MM-DD format
        datasets,
        findings,
      });
    }

    return trends;
  }

  private async getPIIDistribution(userId: string, startDate: Date, endDate: Date): Promise<PIIDistribution[]> {
    const results = await this.db.finding.groupBy({
      by: ['entityType'],
      where: {
        dataset: { 
          project: { userId }
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        entityType: true,
      },
    });

    const totalFindings = results.reduce((sum, result) => sum + result._count.entityType, 0);
    
    return results.map((result) => ({
      entityType: result.entityType,
      count: result._count.entityType,
      percentage: totalFindings > 0 ? (result._count.entityType / totalFindings) * 100 : 0,
      riskLevel: this.getRiskLevel(result.entityType),
    })).sort((a, b) => b.count - a.count);
  }

  private async getRecentHighRiskFindings(userId: string, limit: number): Promise<RecentHighRiskFinding[]> {
    const findings = await this.db.finding.findMany({
      where: {
        dataset: { 
          project: { userId }
        },
        entityType: {
          in: ['SSN', 'CREDIT_CARD', 'MEDICAL_LICENSE', 'US_PASSPORT', 'US_DRIVER_LICENSE'],
        },
      },
      include: {
        dataset: {
          include: {
            project: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return findings.map((finding) => ({
      id: finding.id,
      datasetId: finding.datasetId,
      datasetName: finding.dataset.name,
      entityType: finding.entityType,
      confidence: finding.confidence,
      riskLevel: this.getRiskLevel(finding.entityType),
      createdAt: finding.createdAt,
      projectName: finding.dataset.project.name,
    }));
  }

  private getRiskLevel(entityType: string): 'high' | 'medium' | 'low' {
    const highRisk = ['SSN', 'CREDIT_CARD', 'MEDICAL_LICENSE', 'US_PASSPORT', 'US_DRIVER_LICENSE', 'UK_NHS'];
    const mediumRisk = ['EMAIL_ADDRESS', 'PHONE_NUMBER', 'IBAN', 'IP_ADDRESS'];
    
    if (highRisk.includes(entityType)) return 'high';
    if (mediumRisk.includes(entityType)) return 'medium';
    return 'low';
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private calculateTrend(current: number, previous: number, inverted = false): 'up' | 'down' | 'stable' {
    const threshold = 0.05; // 5% threshold for "stable"
    const change = current - previous;
    const changePercentage = previous > 0 ? Math.abs(change / previous) : (current > 0 ? 1 : 0);
    
    if (changePercentage < threshold) return 'stable';
    
    const isUp = change > 0;
    if (inverted) {
      return isUp ? 'down' : 'up';
    }
    return isUp ? 'up' : 'down';
  }

  // =============================================
  // PII Analysis Methods
  // =============================================

  async getPIIAnalysisData(userId: string, query: PIIAnalysisQueryDto): Promise<PIIAnalysisData> {
    const { startDate, endDate } = this.calculateDateRange({
      range: query.range,
      startDate: query.startDate,
      endDate: query.endDate
    });
    
    this.logger.log(`Generating PII analysis report for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      const [
        entityBreakdown,
        confidenceDistribution,
        fileTypeAnalysis,
        detectionPerformance,
        jobPerformance
      ] = await Promise.all([
        this.getEntityTypeBreakdown(userId, startDate, endDate, query.entityType),
        this.getConfidenceDistribution(userId, startDate, endDate),
        this.getFileTypeAnalysis(userId, startDate, endDate),
        this.getDetectionPerformance(userId, startDate, endDate),
        this.getJobPerformance(userId, startDate, endDate)
      ]);

      return {
        entityBreakdown,
        confidenceDistribution,
        fileTypeAnalysis,
        detectionPerformance,
        jobPerformance,
        dateRange: { startDate, endDate }
      };

    } catch (error) {
      this.logger.error(`Failed to generate PII analysis report for user ${userId}`, {
        error: error.message,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      throw new Error('Failed to generate PII analysis report');
    }
  }

  private async getEntityTypeBreakdown(
    userId: string, 
    startDate: Date, 
    endDate: Date,
    filterEntityType?: string
  ): Promise<EntityTypeBreakdown[]> {
    const whereClause: any = {
      dataset: { 
        project: { userId }
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filterEntityType) {
      whereClause.entityType = filterEntityType;
    }

    const results = await this.db.finding.groupBy({
      by: ['entityType'],
      where: whereClause,
      _count: {
        entityType: true,
      },
      _avg: {
        confidence: true,
      },
    });

    const totalFindings = results.reduce((sum, result) => sum + result._count.entityType, 0);

    return results.map((result) => ({
      entityType: result.entityType,
      count: result._count.entityType,
      percentage: totalFindings > 0 ? (result._count.entityType / totalFindings) * 100 : 0,
      avgConfidence: result._avg.confidence || 0,
      riskLevel: this.getRiskLevel(result.entityType),
    })).sort((a, b) => b.count - a.count);
  }

  private async getConfidenceDistribution(userId: string, startDate: Date, endDate: Date): Promise<ConfidenceDistribution[]> {
    const findings = await this.db.finding.findMany({
      where: {
        dataset: { 
          project: { userId }
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        confidence: true,
        entityType: true,
      },
    });

    const confidenceBuckets = [
      { range: '0.9-1.0', label: 'Very High (90-100%)', min: 0.9, max: 1.0, count: 0, entities: [] as string[] },
      { range: '0.8-0.9', label: 'High (80-90%)', min: 0.8, max: 0.9, count: 0, entities: [] as string[] },
      { range: '0.7-0.8', label: 'Medium (70-80%)', min: 0.7, max: 0.8, count: 0, entities: [] as string[] },
      { range: '0.5-0.7', label: 'Low (50-70%)', min: 0.5, max: 0.7, count: 0, entities: [] as string[] },
      { range: '0.0-0.5', label: 'Very Low (0-50%)', min: 0.0, max: 0.5, count: 0, entities: [] as string[] },
    ];

    findings.forEach((finding) => {
      const bucket = confidenceBuckets.find(b => 
        finding.confidence >= b.min && finding.confidence < b.max
      );
      if (bucket) {
        bucket.count++;
        if (!bucket.entities.includes(finding.entityType)) {
          bucket.entities.push(finding.entityType);
        }
      }
    });

    const totalFindings = findings.length;

    return confidenceBuckets.map(bucket => ({
      range: bucket.range,
      label: bucket.label,
      count: bucket.count,
      percentage: totalFindings > 0 ? (bucket.count / totalFindings) * 100 : 0,
      entityTypes: bucket.entities.length,
    }));
  }

  private async getFileTypeAnalysis(userId: string, startDate: Date, endDate: Date): Promise<FileTypeAnalysis[]> {
    // Get dataset file types first
    const datasets = await this.db.dataset.findMany({
      where: {
        project: { userId },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        fileType: true,
        fileSize: true,
        extractionMethod: true,
        _count: {
          select: {
            findings: true,
          },
        },
      },
    });

    // Group datasets by file type
    const fileTypeGroups = new Map<string, {
      datasetCount: number;
      findingsCount: number;
      totalSizeMB: number;
    }>();

    datasets.forEach((dataset) => {
      const current = fileTypeGroups.get(dataset.fileType) || {
        datasetCount: 0,
        findingsCount: 0,
        totalSizeMB: 0,
      };

      fileTypeGroups.set(dataset.fileType, {
        datasetCount: current.datasetCount + 1,
        findingsCount: current.findingsCount + dataset._count.findings,
        totalSizeMB: current.totalSizeMB + (Number(dataset.fileSize) / (1024 * 1024)),
      });
    });

    return Array.from(fileTypeGroups.entries()).map(([fileType, stats]) => ({
      fileType,
      datasetCount: stats.datasetCount,
      findingsCount: stats.findingsCount,
      totalSizeMB: Math.round(stats.totalSizeMB * 100) / 100,
      piiDensity: stats.totalSizeMB > 0 ? Math.round((stats.findingsCount / stats.totalSizeMB) * 100) / 100 : 0,
      avgFindingsPerFile: stats.datasetCount > 0 ? Math.round((stats.findingsCount / stats.datasetCount) * 100) / 100 : 0,
    })).sort((a, b) => b.findingsCount - a.findingsCount);
  }

  private async getDetectionPerformance(userId: string, startDate: Date, endDate: Date): Promise<DetectionPerformance> {
    const datasets = await this.db.dataset.findMany({
      where: {
        project: { userId },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        findings: true,
        jobs: {
          where: {
            type: 'ANALYZE_PII',
          },
          select: {
            status: true,
            startedAt: true,
            endedAt: true,
            error: true,
          },
        },
      },
    });

    const extractionMethods = new Map<string, { count: number; avgConfidence: number; totalConfidence: number }>();
    let totalProcessingTime = 0;
    let successfulJobs = 0;
    let failedJobs = 0;
    let totalDatasets = datasets.length;

    datasets.forEach((dataset) => {
      // Extraction method analysis
      const method = dataset.extractionMethod || 'unknown';
      const avgConfidence = dataset.findings.length > 0 
        ? dataset.findings.reduce((sum, f) => sum + f.confidence, 0) / dataset.findings.length 
        : 0;

      const current = extractionMethods.get(method) || { count: 0, avgConfidence: 0, totalConfidence: 0 };
      extractionMethods.set(method, {
        count: current.count + 1,
        totalConfidence: current.totalConfidence + avgConfidence,
        avgConfidence: (current.totalConfidence + avgConfidence) / (current.count + 1),
      });

      // Job performance analysis
      dataset.jobs.forEach((job) => {
        if (job.status === 'COMPLETED') {
          successfulJobs++;
          if (job.startedAt && job.endedAt) {
            totalProcessingTime += job.endedAt.getTime() - job.startedAt.getTime();
          }
        } else if (job.status === 'FAILED') {
          failedJobs++;
        }
      });
    });

    const extractionMethodStats = Array.from(extractionMethods.entries()).map(([method, stats]) => ({
      method,
      count: stats.count,
      avgConfidence: Math.round(stats.avgConfidence * 1000) / 10, // Convert to percentage
      successRate: Math.round((stats.count / totalDatasets) * 100),
    }));

    return {
      totalDatasets,
      successfulJobs,
      failedJobs,
      successRate: totalDatasets > 0 ? Math.round((successfulJobs / (successfulJobs + failedJobs)) * 100) : 0,
      avgProcessingTimeMs: successfulJobs > 0 ? Math.round(totalProcessingTime / successfulJobs) : 0,
      extractionMethods: extractionMethodStats.sort((a, b) => b.count - a.count),
    };
  }

  private async getJobPerformance(userId: string, startDate: Date, endDate: Date): Promise<JobPerformanceStats[]> {
    const jobTypes = ['EXTRACT_TEXT', 'ANALYZE_PII', 'ANONYMIZE', 'GENERATE_REPORT'];
    
    const results = await Promise.all(
      jobTypes.map(async (jobType) => {
        const jobs = await this.db.job.findMany({
          where: {
            type: jobType as any,
            dataset: {
              project: { userId },
            },
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            status: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
            error: true,
          },
        });

        const completed = jobs.filter(j => j.status === 'COMPLETED');
        const failed = jobs.filter(j => j.status === 'FAILED');
        const running = jobs.filter(j => j.status === 'RUNNING');
        const queued = jobs.filter(j => j.status === 'QUEUED');

        const processingTimes = completed
          .filter(j => j.startedAt && j.endedAt)
          .map(j => j.endedAt!.getTime() - j.startedAt!.getTime());

        const avgProcessingTime = processingTimes.length > 0 
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
          : 0;

        return {
          jobType,
          totalJobs: jobs.length,
          completed: completed.length,
          failed: failed.length,
          running: running.length,
          queued: queued.length,
          successRate: jobs.length > 0 ? Math.round((completed.length / jobs.length) * 100) : 0,
          avgProcessingTimeMs: Math.round(avgProcessingTime),
          commonErrors: failed
            .filter(j => j.error)
            .reduce((acc, job) => {
              const error = job.error!.substring(0, 100); // Truncate long errors
              acc[error] = (acc[error] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
        };
      })
    );

    return results;
  }

  async getComplianceData(userId: string, query: ComplianceQueryDto): Promise<ComplianceData> {
    const { startDate, endDate } = this.calculateDateRange(query as any);
    
    this.logger.log(`Generating compliance report for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      // Execute all queries in parallel for better performance
      const [
        metrics,
        policyEffectiveness,
        auditTrail,
        dataRetention,
        riskAssessment,
      ] = await Promise.all([
        this.getComplianceMetrics(userId, startDate, endDate),
        this.getPolicyEffectiveness(userId, query.policyName),
        this.getAuditTrail(userId, startDate, endDate, query.action, 50),
        this.getDataRetentionMetrics(userId),
        this.getRiskAssessment(userId, startDate, endDate),
      ]);

      return {
        metrics,
        policyEffectiveness,
        auditTrail,
        dataRetention,
        riskAssessment,
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      this.logger.error('Error generating compliance data:', error);
      throw error;
    }
  }

  private async getComplianceMetrics(userId: string, startDate: Date, endDate: Date): Promise<ComplianceMetric[]> {
    // Get total datasets in period
    const totalDatasets = await this.db.dataset.count({
      where: {
        project: { userId },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Get processed datasets (datasets with completed jobs)
    const processedDatasets = await this.db.dataset.count({
      where: {
        project: { userId },
        createdAt: { gte: startDate, lte: endDate },
        jobs: {
          some: {
            status: 'COMPLETED',
          },
        },
      },
    });

    // Get high-risk findings
    const highRiskFindings = await this.db.finding.count({
      where: {
        dataset: {
          project: { userId },
          createdAt: { gte: startDate, lte: endDate },
        },
        confidence: { gte: 0.8 },
      },
    });

    // Get policy coverage (datasets with jobs that have policies)
    const datasetsWithPolicies = await this.db.dataset.count({
      where: {
        project: { userId },
        createdAt: { gte: startDate, lte: endDate },
        jobs: {
          some: {
            policyId: { not: null },
          },
        },
      },
    });

    const processingRate = totalDatasets > 0 ? (processedDatasets / totalDatasets) * 100 : 100;
    const policyCoverage = totalDatasets > 0 ? (datasetsWithPolicies / totalDatasets) * 100 : 0;

    return [
      {
        name: 'Processing Coverage',
        value: Math.round(processingRate),
        target: 95,
        status: processingRate >= 95 ? 'compliant' : processingRate >= 80 ? 'warning' : 'violation',
        trend: 'stable',
        description: 'Percentage of datasets successfully processed',
      },
      {
        name: 'Policy Coverage',
        value: Math.round(policyCoverage),
        target: 100,
        status: policyCoverage >= 95 ? 'compliant' : policyCoverage >= 80 ? 'warning' : 'violation',
        trend: 'up',
        description: 'Percentage of datasets with applied policies',
      },
      {
        name: 'High-Risk Findings',
        value: highRiskFindings,
        target: 0,
        status: highRiskFindings === 0 ? 'compliant' : highRiskFindings <= 5 ? 'warning' : 'violation',
        trend: 'down',
        description: 'Number of high-confidence PII findings requiring attention',
      },
      {
        name: 'Data Governance',
        value: 85,
        target: 90,
        status: 'warning',
        trend: 'up',
        description: 'Overall data governance compliance score',
      },
    ];
  }

  private async getPolicyEffectiveness(userId: string, policyNameFilter?: string): Promise<PolicyEffectiveness[]> {
    const whereClause = {
      ...(policyNameFilter && { name: { contains: policyNameFilter, mode: 'insensitive' as const } }),
    };

    const policies = await this.db.policy.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    const results = await Promise.all(
      policies.map(async (policy) => {
        // Get findings for datasets that used this policy (via jobs)
        const findings = await this.db.finding.findMany({
          where: {
            dataset: {
              project: { userId },
              jobs: {
                some: {
                  policyId: policy.id,
                },
              },
            },
          },
        });

        const highRiskFindings = findings.filter(f => f.confidence >= 0.8).length;
        const totalFindings = findings.length;
        
        // Calculate effectiveness score based on findings and confidence
        const effectivenessScore = totalFindings > 0 
          ? Math.max(0, 100 - (highRiskFindings / totalFindings) * 100)
          : policy._count.jobs > 0 ? 95 : 0;

        // Get last applied date via jobs
        const lastAppliedJob = await this.db.job.findFirst({
          where: { policyId: policy.id },
          orderBy: { createdAt: 'desc' },
        });

        return {
          policyId: policy.id,
          policyName: policy.name,
          version: policy.version,
          isActive: policy.isActive,
          appliedDatasets: policy._count.jobs,
          totalFindings,
          highRiskFindings,
          effectivenessScore: Math.round(effectivenessScore),
          lastApplied: lastAppliedJob?.createdAt || new Date(0),
        };
      })
    );

    return results.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
  }

  private async getAuditTrail(
    userId: string, 
    startDate: Date, 
    endDate: Date, 
    actionFilter?: string,
    limit: number = 50
  ): Promise<AuditTrailEntry[]> {
    const whereClause = {
      userId,
      createdAt: { gte: startDate, lte: endDate },
      ...(actionFilter && { action: actionFilter as any }),
    };

    const auditLogs = await this.db.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      userEmail: log.user.email,
      ipAddress: log.ipAddress || 'Unknown',
      userAgent: log.userAgent || 'Unknown',
      details: log.details,
      timestamp: log.createdAt,
      resourceType: log.resource,
      resourceId: log.resourceId,
    }));
  }

  private async getDataRetentionMetrics(userId: string): Promise<DataRetentionMetric[]> {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - 2); // 2-year retention policy

    const totalDatasets = await this.db.dataset.count({
      where: { project: { userId } },
    });

    const oldDatasets = await this.db.dataset.count({
      where: {
        project: { userId },
        createdAt: { lt: retentionDate },
      },
    });

    // Note: We don't have a DELETED status in current schema
    const deletedDatasets = 0;

    return [
      {
        category: 'Dataset Records',
        totalRecords: totalDatasets,
        dueForDeletion: oldDatasets,
        deletedRecords: deletedDatasets,
        retentionPeriod: '2 years',
        complianceStatus: oldDatasets === 0 ? 'compliant' : oldDatasets <= 5 ? 'warning' : 'violation',
      },
      {
        category: 'PII Findings',
        totalRecords: await this.db.finding.count({ where: { dataset: { project: { userId } } } }),
        dueForDeletion: await this.db.finding.count({
          where: {
            dataset: {
              project: { userId },
              createdAt: { lt: retentionDate },
            },
          },
        }),
        deletedRecords: 0, // Findings are typically soft-deleted with datasets
        retentionPeriod: '2 years',
        complianceStatus: 'compliant',
      },
      {
        category: 'Audit Logs',
        totalRecords: await this.db.auditLog.count({ where: { userId } }),
        dueForDeletion: await this.db.auditLog.count({
          where: {
            userId,
            createdAt: { lt: retentionDate },
          },
        }),
        deletedRecords: 0, // Audit logs are typically never deleted
        retentionPeriod: 'Permanent',
        complianceStatus: 'compliant',
      },
    ];
  }

  private async getRiskAssessment(userId: string, startDate: Date, endDate: Date): Promise<ComplianceRiskAssessment> {
    // Get various risk factors
    const [
      totalDatasets,
      unprocessedDatasets,
      highRiskFindings,
      datasetsWithoutPolicies,
      failedJobs,
    ] = await Promise.all([
      this.db.dataset.count({
        where: {
          project: { userId },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.db.dataset.count({
        where: {
          project: { userId },
          createdAt: { gte: startDate, lte: endDate },
          status: 'PENDING',
        },
      }),
      this.db.finding.count({
        where: {
          dataset: {
            project: { userId },
            createdAt: { gte: startDate, lte: endDate },
          },
          confidence: { gte: 0.8 },
        },
      }),
      this.db.dataset.count({
        where: {
          project: { userId },
          createdAt: { gte: startDate, lte: endDate },
          jobs: {
            none: {
              policyId: { not: null },
            },
          },
        },
      }),
      this.db.job.count({
        where: {
          dataset: {
            project: { userId },
            createdAt: { gte: startDate, lte: endDate },
          },
          status: 'FAILED',
        },
      }),
    ]);

    const factors = [
      {
        name: 'Processing Backlog',
        weight: 0.3,
        score: totalDatasets > 0 ? Math.max(0, 100 - (unprocessedDatasets / totalDatasets) * 100) : 100,
        description: `${unprocessedDatasets} datasets pending processing out of ${totalDatasets}`,
      },
      {
        name: 'High-Risk PII Exposure',
        weight: 0.4,
        score: Math.max(0, 100 - Math.min(highRiskFindings * 5, 100)),
        description: `${highRiskFindings} high-confidence PII findings detected`,
      },
      {
        name: 'Policy Coverage',
        weight: 0.2,
        score: totalDatasets > 0 ? Math.max(0, 100 - (datasetsWithoutPolicies / totalDatasets) * 100) : 100,
        description: `${datasetsWithoutPolicies} datasets without assigned policies`,
      },
      {
        name: 'System Reliability',
        weight: 0.1,
        score: Math.max(0, 100 - failedJobs * 10),
        description: `${failedJobs} failed processing jobs`,
      },
    ];

    // Calculate weighted risk score
    const totalScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    let recommendations: string[] = [];

    if (totalScore >= 85) {
      riskLevel = 'low';
      recommendations = [
        'Continue current compliance practices',
        'Regular monitoring and review cycles',
      ];
    } else if (totalScore >= 70) {
      riskLevel = 'medium';
      recommendations = [
        'Review and update policy coverage',
        'Address processing backlogs',
        'Monitor high-risk findings more closely',
      ];
    } else if (totalScore >= 50) {
      riskLevel = 'high';
      recommendations = [
        'Immediate review of high-risk PII findings',
        'Implement policies for uncovered datasets',
        'Address system reliability issues',
        'Consider additional security measures',
      ];
    } else {
      riskLevel = 'critical';
      recommendations = [
        'URGENT: Address all high-risk PII findings',
        'Implement comprehensive policy coverage',
        'Review data processing workflows',
        'Consider external compliance audit',
        'Implement additional monitoring and alerting',
      ];
    }

    return {
      riskLevel,
      score: Math.round(totalScore),
      factors: factors.map(f => ({ ...f, score: Math.round(f.score) })),
      recommendations,
    };
  }
}