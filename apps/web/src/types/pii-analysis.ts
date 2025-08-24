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

export interface PIIAnalysisQueryParams {
  range?: '7d' | '30d' | '90d' | 'all';
  startDate?: string;
  endDate?: string;
  entityType?: string;
  fileType?: string;
  projectId?: string;
}