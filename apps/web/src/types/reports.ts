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

export interface OverviewQueryParams {
  range?: '7d' | '30d' | '90d' | 'all';
  startDate?: string;
  endDate?: string;
}