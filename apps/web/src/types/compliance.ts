export interface ComplianceMetric {
  name: string;
  value: number;
  target: number;
  status: 'compliant' | 'warning' | 'violation';
  trend: 'up' | 'down' | 'stable';
  description: string;
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

export interface ComplianceRiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface ComplianceRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: ComplianceRiskFactor[];
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

export interface ComplianceQueryParams {
  range?: '7d' | '30d' | '90d' | 'all';
  policyName?: string;
  action?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}