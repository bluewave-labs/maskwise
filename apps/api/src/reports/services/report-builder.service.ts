import { Injectable, BadRequestException } from '@nestjs/common';

interface MetricWithChange {
  value: number;
  change: number;
}

interface OverviewMetrics {
  totalDatasets: MetricWithChange;
  totalFindings: MetricWithChange;
  averageConfidence: MetricWithChange;
  highRiskFindings: MetricWithChange;
}

interface TrendData {
  date: string;
  datasets: number;
  findings: number;
  avgConfidence: number;
}

interface DistributionData {
  entityType: string;
  count: number;
  percentage: number;
}

interface EntityData {
  entityType: string;
  count: number;
  avgConfidence: number;
  files: number;
}

interface ConfidenceData {
  range: string;
  count: number;
  percentage: number;
}

interface FileTypeData {
  fileType: string;
  totalFiles: number;
  avgFindings: number;
  riskScore: number;
}

interface ComplianceMetrics {
  overallScore: number;
  policyCompliance: number;
  dataRetention: number;
  auditReadiness: number;
}

interface PolicyData {
  policyName: string;
  applicableFindings: number;
  processedFindings: number;
  effectivenessScore: number;
}

interface AuditData {
  recentActivities: Array<{
    action: string;
    timestamp: Date;
    user: string;
    details: string;
  }>;
  complianceEvents: Array<{
    event: string;
    count: number;
    date: string;
  }>;
}

interface RiskData {
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  recommendations: string[];
}

@Injectable()
export class ReportBuilderService {
  
  buildOverviewReport(metrics: OverviewMetrics, trendData: TrendData[], distributionData: DistributionData[]) {
    if (typeof metrics !== 'object' || metrics === null) {
      throw new BadRequestException('Invalid metrics data');
    }

    const summary = {
      totalDatasets: metrics.totalDatasets?.value || 0,
      totalFindings: metrics.totalFindings?.value || 0,
      averageConfidence: metrics.averageConfidence?.value || 0,
      riskLevel: this.calculateRiskLevel(metrics.totalFindings?.value || 0, metrics.highRiskFindings?.value || 0)
    };

    const processedMetrics = {
      totalDatasets: {
        ...metrics.totalDatasets,
        changeType: this.getChangeType(metrics.totalDatasets?.change || 0)
      },
      totalFindings: {
        ...metrics.totalFindings,
        changeType: this.getChangeType(metrics.totalFindings?.change || 0)
      },
      averageConfidence: {
        ...metrics.averageConfidence,
        changeType: this.getChangeType(metrics.averageConfidence?.change || 0)
      },
      highRiskFindings: {
        ...metrics.highRiskFindings,
        changeType: this.getChangeType(metrics.highRiskFindings?.change || 0)
      }
    };

    const insights = this.generateInsights(metrics, trendData, distributionData);
    const recommendations = this.generateRecommendations(metrics, insights);

    return {
      summary,
      metrics: processedMetrics,
      trends: trendData || [],
      distribution: distributionData || [],
      insights,
      recommendations
    };
  }

  buildPiiAnalysisReport(entityData: EntityData[], confidenceData: ConfidenceData[], fileTypeData: FileTypeData[]) {
    if (entityData && !Array.isArray(entityData)) {
      throw new BadRequestException('Invalid entity data');
    }

    const safeEntityData = entityData || [];
    const safeConfidenceData = confidenceData || [];
    const safeFileTypeData = fileTypeData || [];

    const entityAnalysis = {
      totalEntities: safeEntityData.length,
      totalFindings: safeEntityData.reduce((sum, entity) => sum + entity.count, 0),
      averageConfidence: safeEntityData.length > 0 
        ? safeEntityData.reduce((sum, entity) => sum + entity.avgConfidence, 0) / safeEntityData.length
        : 0,
      mostCommon: safeEntityData.length > 0 
        ? safeEntityData.reduce((max, entity) => entity.count > max.count ? entity : max).entityType
        : null
    };

    const confidenceAnalysis = {
      highConfidence: safeConfidenceData.find(c => c.range === '0.9-1.0')?.count || 0,
      mediumConfidence: safeConfidenceData.find(c => c.range === '0.8-0.9')?.count || 0,
      lowConfidence: safeConfidenceData.find(c => c.range === '0.7-0.8')?.count || 0,
      averageConfidence: this.calculateWeightedAverageConfidence(safeConfidenceData)
    };

    const fileTypeAnalysis = safeFileTypeData.map(fileType => ({
      ...fileType,
      riskLevel: this.determineRiskLevel(fileType.riskScore)
    }));

    const riskAssessment = this.generateRiskAssessment(safeEntityData, safeFileTypeData, entityAnalysis);
    const recommendations = this.generatePiiRecommendations(entityAnalysis, confidenceAnalysis, riskAssessment);

    return {
      entityAnalysis,
      confidenceAnalysis,
      fileTypeAnalysis,
      riskAssessment,
      recommendations
    };
  }

  buildComplianceReport(metrics: ComplianceMetrics, policyData: PolicyData[], auditData: AuditData, riskData: RiskData) {
    if (auditData && typeof auditData !== 'object') {
      throw new BadRequestException('Invalid audit data');
    }

    const safeMetrics = metrics || { overallScore: 0, policyCompliance: 0, dataRetention: 0, auditReadiness: 0 };
    const safePolicyData = policyData || [];
    const safeAuditData = auditData || { recentActivities: [], complianceEvents: [] };
    const safeRiskData = riskData || { highRisk: 0, mediumRisk: 0, lowRisk: 0, recommendations: [] };

    const complianceOverview = {
      overallScore: safeMetrics.overallScore,
      status: this.getComplianceStatus(safeMetrics.overallScore),
      totalPolicies: safePolicyData.length,
      activePolicies: safePolicyData.length, // Assuming all are active
      averageEffectiveness: safePolicyData.length > 0 
        ? safePolicyData.reduce((sum, policy) => sum + policy.effectivenessScore, 0) / safePolicyData.length
        : 0
    };

    const policyEffectiveness = safePolicyData.map(policy => ({
      policyName: policy.policyName,
      coverageRate: policy.applicableFindings > 0 
        ? Math.round((policy.processedFindings / policy.applicableFindings) * 100)
        : 0,
      effectivenessScore: policy.effectivenessScore,
      status: this.getPolicyStatus(policy.processedFindings, policy.applicableFindings)
    }));

    const auditSummary = {
      totalActivities: safeAuditData.recentActivities.length,
      recentActivityCount: safeAuditData.recentActivities.length,
      complianceEventsCount: safeAuditData.complianceEvents.length,
      mostCommonActivity: this.getMostCommonActivity(safeAuditData.recentActivities)
    };

    const totalRiskItems = safeRiskData.highRisk + safeRiskData.mediumRisk + safeRiskData.lowRisk;
    const riskAnalysis = {
      totalRiskItems,
      highRiskPercentage: totalRiskItems > 0 ? Math.round((safeRiskData.highRisk / totalRiskItems) * 100) : 0,
      mediumRiskPercentage: totalRiskItems > 0 ? Math.round((safeRiskData.mediumRisk / totalRiskItems) * 100) : 0,
      lowRiskPercentage: totalRiskItems > 0 ? Math.round((safeRiskData.lowRisk / totalRiskItems) * 100) : 0,
      overallRiskLevel: this.getOverallRiskLevel(safeRiskData.highRisk, totalRiskItems)
    };

    const recommendations = [...(safeRiskData.recommendations || [])];
    const actionItems = this.generateActionItems(safeMetrics, riskAnalysis);

    return {
      complianceOverview,
      policyEffectiveness,
      auditSummary,
      riskAnalysis,
      recommendations,
      actionItems
    };
  }

  private calculatePercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100 * 100) / 100 : 0;
  }

  private determineRiskLevel(score: number): string {
    if (score >= 0.8) return 'HIGH';
    if (score >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  private getChangeType(change: number): string {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  }

  private calculateRiskLevel(totalFindings: number, highRiskFindings: number): string {
    if (totalFindings === 0) return 'LOW';
    const riskPercentage = (highRiskFindings / totalFindings) * 100;
    if (riskPercentage >= 20) return 'HIGH';
    if (riskPercentage >= 10) return 'MEDIUM';
    return 'LOW';
  }

  private generateInsights(metrics: OverviewMetrics, trendData: TrendData[], distributionData: DistributionData[]) {
    const insights = [];

    // Performance trend insight
    if (metrics.totalDatasets?.change > 0) {
      insights.push({
        type: 'performance_trend',
        message: `Dataset processing increased by ${metrics.totalDatasets.change}`,
        severity: 'INFO'
      });
    }

    // Data availability insight
    if (!trendData || trendData.length === 0) {
      insights.push({
        type: 'data_availability',
        message: 'No trend data available for analysis',
        severity: 'LOW'
      });
    }

    if (!distributionData || distributionData.length === 0) {
      insights.push({
        type: 'data_availability',
        message: 'No distribution data available for analysis',
        severity: 'LOW'
      });
    }

    // Risk assessment insight
    const riskLevel = this.calculateRiskLevel(metrics.totalFindings?.value || 0, metrics.highRiskFindings?.value || 0);
    if (riskLevel === 'HIGH') {
      insights.push({
        type: 'risk_assessment',
        message: 'High percentage of findings classified as high-risk',
        severity: 'HIGH'
      });
    }

    return insights;
  }

  private generateRecommendations(metrics: OverviewMetrics, insights: any[]) {
    const recommendations = [];

    const highRiskInsight = insights.find(i => i.type === 'risk_assessment' && i.severity === 'HIGH');
    if (highRiskInsight) {
      recommendations.push({
        category: 'risk_mitigation',
        message: 'Review and enhance PII detection policies',
        priority: 'HIGH'
      });
    }

    const dataAvailabilityInsights = insights.filter(i => i.type === 'data_availability');
    if (dataAvailabilityInsights.length > 0) {
      recommendations.push({
        category: 'data_collection',
        message: 'Improve data collection and analysis pipeline',
        priority: 'MEDIUM'
      });
    }

    return recommendations;
  }

  private calculateWeightedAverageConfidence(confidenceData: ConfidenceData[]): number {
    if (!confidenceData || confidenceData.length === 0) return 0;

    const totalCount = confidenceData.reduce((sum, c) => sum + c.count, 0);
    if (totalCount === 0) return 0;

    const weightedSum = confidenceData.reduce((sum, c) => {
      const midpoint = this.getConfidenceMidpoint(c.range);
      return sum + (midpoint * c.count);
    }, 0);

    return Math.round((weightedSum / totalCount) * 1000) / 1000; // 3 decimal places
  }

  private getConfidenceMidpoint(range: string): number {
    const ranges = {
      '0.9-1.0': 0.95,
      '0.8-0.9': 0.85,
      '0.7-0.8': 0.75,
      '0.6-0.7': 0.65,
      '0.5-0.6': 0.55
    };
    return ranges[range] || 0.5;
  }

  private generateRiskAssessment(entityData: EntityData[], fileTypeData: FileTypeData[], entityAnalysis: any) {
    const criticalEntities = entityData
      .filter(entity => entity.count > 100 || entity.entityType === 'SSN' || entity.entityType === 'CREDIT_CARD')
      .map(entity => entity.entityType);

    const vulnerableFileTypes = fileTypeData
      .filter(fileType => fileType.riskScore > 0.7)
      .map(fileType => fileType.fileType);

    const overallRisk = this.determineOverallRisk(entityAnalysis.totalFindings, criticalEntities.length);

    return {
      overallRisk,
      criticalEntities,
      vulnerableFileTypes,
      confidenceGaps: entityData.filter(entity => entity.avgConfidence < 0.8).length
    };
  }

  private determineOverallRisk(totalFindings: number, criticalEntitiesCount: number): string {
    if (totalFindings === 0) return 'UNKNOWN';
    if (criticalEntitiesCount >= 2 || totalFindings > 1000) return 'HIGH';
    if (criticalEntitiesCount >= 1 || totalFindings > 500) return 'MEDIUM';
    return 'LOW';
  }

  private generatePiiRecommendations(entityAnalysis: any, confidenceAnalysis: any, riskAssessment: any) {
    const recommendations = [];

    if (riskAssessment.overallRisk === 'HIGH') {
      recommendations.push({
        category: 'risk_mitigation',
        message: 'Implement immediate PII protection measures',
        priority: 'CRITICAL'
      });
    }

    if (confidenceAnalysis.averageConfidence < 0.8) {
      recommendations.push({
        category: 'detection_improvement',
        message: 'Review and tune PII detection models',
        priority: 'HIGH'
      });
    }

    if (riskAssessment.confidenceGaps > 0) {
      recommendations.push({
        category: 'quality_assurance',
        message: 'Investigate low-confidence PII detections',
        priority: 'MEDIUM'
      });
    }

    return recommendations;
  }

  private getComplianceStatus(score: number): string {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 60) return 'FAIR';
    return 'POOR';
  }

  private getPolicyStatus(processed: number, applicable: number): string {
    if (applicable === 0) return 'NO_DATA';
    const percentage = (processed / applicable) * 100;
    if (percentage >= 95) return 'EXCELLENT';
    if (percentage >= 80) return 'GOOD';
    if (percentage >= 60) return 'FAIR';
    return 'POOR';
  }

  private getMostCommonActivity(activities: Array<{ action: string }>): string {
    if (!activities || activities.length === 0) return 'None';
    
    const actionCounts = activities.reduce((counts, activity) => {
      counts[activity.action] = (counts[activity.action] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
  }

  private getOverallRiskLevel(highRisk: number, totalRiskItems: number): string {
    if (totalRiskItems === 0) return 'UNKNOWN';
    const highRiskPercentage = (highRisk / totalRiskItems) * 100;
    if (highRiskPercentage >= 20) return 'HIGH';
    if (highRiskPercentage >= 10) return 'MEDIUM';
    return 'LOW';
  }

  private generateActionItems(metrics: ComplianceMetrics, riskAnalysis: any) {
    const actionItems = [];

    if (metrics.overallScore < 60) {
      actionItems.push({
        category: 'compliance_improvement',
        description: 'Develop comprehensive compliance improvement plan',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
    }

    if (riskAnalysis.overallRiskLevel === 'HIGH') {
      actionItems.push({
        category: 'risk_mitigation',
        description: 'Implement immediate risk mitigation strategies',
        priority: 'CRITICAL',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });
    }

    if (metrics.auditReadiness < 70) {
      actionItems.push({
        category: 'audit_preparation',
        description: 'Enhance audit readiness and documentation',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      });
    }

    return actionItems;
  }
}