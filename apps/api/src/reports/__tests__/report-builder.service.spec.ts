import { Test, TestingModule } from '@nestjs/testing';
import { ReportBuilderService } from '../services/report-builder.service';
import { BadRequestException } from '@nestjs/common';

describe('ReportBuilderService', () => {
  let service: ReportBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportBuilderService]
    }).compile();

    service = module.get<ReportBuilderService>(ReportBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildOverviewReport', () => {
    const mockMetrics = {
      totalDatasets: { value: 100, change: 5 },
      totalFindings: { value: 500, change: 10 },
      averageConfidence: { value: 0.85, change: 0.05 },
      highRiskFindings: { value: 25, change: -2 }
    };

    const mockTrendData = [
      { date: '2024-01-01', datasets: 10, findings: 50, avgConfidence: 0.8 },
      { date: '2024-01-02', datasets: 12, findings: 60, avgConfidence: 0.82 }
    ];

    const mockDistributionData = [
      { entityType: 'EMAIL_ADDRESS', count: 200, percentage: 40 },
      { entityType: 'SSN', count: 150, percentage: 30 },
      { entityType: 'CREDIT_CARD', count: 150, percentage: 30 }
    ];

    it('should build complete overview report', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, mockDistributionData);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('distribution');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
    });

    it('should generate accurate summary statistics', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, mockDistributionData);

      expect(result.summary.totalDatasets).toBe(100);
      expect(result.summary.totalFindings).toBe(500);
      expect(result.summary.averageConfidence).toBe(0.85);
      expect(result.summary.riskLevel).toBe('MEDIUM'); // 25/500 = 5% high risk
    });

    it('should calculate metrics with proper change indicators', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, mockDistributionData);

      expect(result.metrics.totalDatasets.value).toBe(100);
      expect(result.metrics.totalDatasets.change).toBe(5);
      expect(result.metrics.totalDatasets.changeType).toBe('positive');
      
      expect(result.metrics.highRiskFindings.change).toBe(-2);
      expect(result.metrics.highRiskFindings.changeType).toBe('negative');
    });

    it('should process trend data correctly', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, mockDistributionData);

      expect(result.trends).toHaveLength(2);
      expect(result.trends[0]).toHaveProperty('date', '2024-01-01');
      expect(result.trends[0]).toHaveProperty('datasets', 10);
      expect(result.trends[1]).toHaveProperty('avgConfidence', 0.82);
    });

    it('should calculate distribution percentages correctly', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, mockDistributionData);

      expect(result.distribution).toHaveLength(3);
      expect(result.distribution[0].percentage).toBe(40);
      expect(result.distribution[1].percentage).toBe(30);
      expect(result.distribution[2].percentage).toBe(30);
    });

    it('should generate insights based on data patterns', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, mockDistributionData);

      expect(result.insights).toBeInstanceOf(Array);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0]).toHaveProperty('type');
      expect(result.insights[0]).toHaveProperty('message');
      expect(result.insights[0]).toHaveProperty('severity');
    });

    it('should generate recommendations based on metrics', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, mockDistributionData);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toHaveProperty('category');
      expect(result.recommendations[0]).toHaveProperty('message');
      expect(result.recommendations[0]).toHaveProperty('priority');
    });

    it('should handle empty trend data', () => {
      const result = service.buildOverviewReport(mockMetrics, [], mockDistributionData);

      expect(result.trends).toEqual([]);
      expect(result.insights).toContain(
        expect.objectContaining({
          type: 'data_availability',
          severity: 'LOW'
        })
      );
    });

    it('should handle empty distribution data', () => {
      const result = service.buildOverviewReport(mockMetrics, mockTrendData, []);

      expect(result.distribution).toEqual([]);
      expect(result.insights).toContain(
        expect.objectContaining({
          type: 'data_availability',
          severity: 'LOW'
        })
      );
    });

    it('should calculate risk levels correctly', () => {
      const highRiskMetrics = {
        ...mockMetrics,
        highRiskFindings: { value: 200, change: 50 } // 40% high risk
      };

      const result = service.buildOverviewReport(highRiskMetrics, mockTrendData, mockDistributionData);

      expect(result.summary.riskLevel).toBe('HIGH');
      expect(result.insights).toContain(
        expect.objectContaining({
          type: 'risk_assessment',
          severity: 'HIGH'
        })
      );
    });
  });

  describe('buildPiiAnalysisReport', () => {
    const mockEntityData = [
      { entityType: 'EMAIL_ADDRESS', count: 200, avgConfidence: 0.9, files: 50 },
      { entityType: 'SSN', count: 150, avgConfidence: 0.85, files: 30 }
    ];

    const mockConfidenceData = [
      { range: '0.9-1.0', count: 200, percentage: 50 },
      { range: '0.8-0.9', count: 150, percentage: 37.5 },
      { range: '0.7-0.8', count: 50, percentage: 12.5 }
    ];

    const mockFileTypeData = [
      { fileType: 'PDF', totalFiles: 30, avgFindings: 10, riskScore: 0.7 },
      { fileType: 'DOCX', totalFiles: 20, avgFindings: 8, riskScore: 0.6 }
    ];

    it('should build complete PII analysis report', () => {
      const result = service.buildPiiAnalysisReport(mockEntityData, mockConfidenceData, mockFileTypeData);

      expect(result).toHaveProperty('entityAnalysis');
      expect(result).toHaveProperty('confidenceAnalysis');
      expect(result).toHaveProperty('fileTypeAnalysis');
      expect(result).toHaveProperty('riskAssessment');
      expect(result).toHaveProperty('recommendations');
    });

    it('should analyze entity types correctly', () => {
      const result = service.buildPiiAnalysisReport(mockEntityData, mockConfidenceData, mockFileTypeData);

      expect(result.entityAnalysis.totalEntities).toBe(2);
      expect(result.entityAnalysis.totalFindings).toBe(350);
      expect(result.entityAnalysis.averageConfidence).toBeCloseTo(0.877, 2);
      expect(result.entityAnalysis.mostCommon).toBe('EMAIL_ADDRESS');
    });

    it('should analyze confidence distribution', () => {
      const result = service.buildPiiAnalysisReport(mockEntityData, mockConfidenceData, mockFileTypeData);

      expect(result.confidenceAnalysis.highConfidence).toBe(200); // 0.9-1.0 range
      expect(result.confidenceAnalysis.mediumConfidence).toBe(150); // 0.8-0.9 range
      expect(result.confidenceAnalysis.lowConfidence).toBe(50); // 0.7-0.8 range
      expect(result.confidenceAnalysis.averageConfidence).toBeCloseTo(0.862, 2);
    });

    it('should analyze file types and calculate risk scores', () => {
      const result = service.buildPiiAnalysisReport(mockEntityData, mockConfidenceData, mockFileTypeData);

      expect(result.fileTypeAnalysis).toHaveLength(2);
      expect(result.fileTypeAnalysis[0].fileType).toBe('PDF');
      expect(result.fileTypeAnalysis[0].riskLevel).toBe('MEDIUM'); // 0.7 risk score
      expect(result.fileTypeAnalysis[1].riskLevel).toBe('MEDIUM'); // 0.6 risk score
    });

    it('should generate risk assessment', () => {
      const result = service.buildPiiAnalysisReport(mockEntityData, mockConfidenceData, mockFileTypeData);

      expect(result.riskAssessment).toHaveProperty('overallRisk');
      expect(result.riskAssessment).toHaveProperty('criticalEntities');
      expect(result.riskAssessment).toHaveProperty('vulnerableFileTypes');
      expect(result.riskAssessment).toHaveProperty('confidenceGaps');
    });

    it('should identify critical entities', () => {
      const criticalEntityData = [
        { entityType: 'SSN', count: 300, avgConfidence: 0.95, files: 100 },
        { entityType: 'CREDIT_CARD', count: 250, avgConfidence: 0.92, files: 80 },
        { entityType: 'EMAIL_ADDRESS', count: 100, avgConfidence: 0.85, files: 50 }
      ];

      const result = service.buildPiiAnalysisReport(criticalEntityData, mockConfidenceData, mockFileTypeData);

      expect(result.riskAssessment.criticalEntities).toContain('SSN');
      expect(result.riskAssessment.criticalEntities).toContain('CREDIT_CARD');
      expect(result.riskAssessment.overallRisk).toBe('HIGH');
    });

    it('should handle empty data gracefully', () => {
      const result = service.buildPiiAnalysisReport([], [], []);

      expect(result.entityAnalysis.totalEntities).toBe(0);
      expect(result.entityAnalysis.totalFindings).toBe(0);
      expect(result.confidenceAnalysis.averageConfidence).toBe(0);
      expect(result.fileTypeAnalysis).toHaveLength(0);
      expect(result.riskAssessment.overallRisk).toBe('UNKNOWN');
    });

    it('should generate appropriate recommendations', () => {
      const result = service.buildPiiAnalysisReport(mockEntityData, mockConfidenceData, mockFileTypeData);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toHaveProperty('category');
      expect(result.recommendations[0]).toHaveProperty('message');
      expect(result.recommendations[0]).toHaveProperty('priority');
    });
  });

  describe('buildComplianceReport', () => {
    const mockMetrics = {
      overallScore: 85,
      policyCompliance: 90,
      dataRetention: 80,
      auditReadiness: 85
    };

    const mockPolicyData = [
      { policyName: 'GDPR Policy', applicableFindings: 100, processedFindings: 95, effectivenessScore: 95 },
      { policyName: 'HIPAA Policy', applicableFindings: 80, processedFindings: 72, effectivenessScore: 90 }
    ];

    const mockAuditData = {
      recentActivities: [
        { action: 'POLICY_UPDATED', timestamp: new Date('2024-01-01'), user: 'admin', details: 'Updated GDPR policy' },
        { action: 'DATA_PROCESSED', timestamp: new Date('2024-01-02'), user: 'user1', details: 'Processed 50 records' }
      ],
      complianceEvents: [
        { event: 'Data Processing', count: 150, date: '2024-01-01' },
        { event: 'Policy Updates', count: 5, date: '2024-01-02' }
      ]
    };

    const mockRiskData = {
      highRisk: 5,
      mediumRisk: 15,
      lowRisk: 80,
      recommendations: ['Update retention policy', 'Review access controls']
    };

    it('should build complete compliance report', () => {
      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result).toHaveProperty('complianceOverview');
      expect(result).toHaveProperty('policyEffectiveness');
      expect(result).toHaveProperty('auditSummary');
      expect(result).toHaveProperty('riskAnalysis');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('actionItems');
    });

    it('should calculate compliance overview correctly', () => {
      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result.complianceOverview.overallScore).toBe(85);
      expect(result.complianceOverview.status).toBe('GOOD'); // Score >= 80
      expect(result.complianceOverview.totalPolicies).toBe(2);
      expect(result.complianceOverview.activePolicies).toBe(2);
      expect(result.complianceOverview.averageEffectiveness).toBeCloseTo(92.5, 1);
    });

    it('should analyze policy effectiveness', () => {
      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result.policyEffectiveness).toHaveLength(2);
      expect(result.policyEffectiveness[0].policyName).toBe('GDPR Policy');
      expect(result.policyEffectiveness[0].coverageRate).toBe(95); // 95/100
      expect(result.policyEffectiveness[0].status).toBe('EXCELLENT'); // >= 95%
      
      expect(result.policyEffectiveness[1].policyName).toBe('HIPAA Policy');
      expect(result.policyEffectiveness[1].coverageRate).toBe(90); // 72/80
      expect(result.policyEffectiveness[1].status).toBe('GOOD'); // >= 80%
    });

    it('should summarize audit activities', () => {
      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result.auditSummary.totalActivities).toBe(2);
      expect(result.auditSummary.recentActivityCount).toBe(2);
      expect(result.auditSummary.complianceEventsCount).toBe(2);
      expect(result.auditSummary.mostCommonActivity).toBeDefined();
    });

    it('should analyze risk distribution', () => {
      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result.riskAnalysis.totalRiskItems).toBe(100); // 5 + 15 + 80
      expect(result.riskAnalysis.highRiskPercentage).toBe(5);
      expect(result.riskAnalysis.mediumRiskPercentage).toBe(15);
      expect(result.riskAnalysis.lowRiskPercentage).toBe(80);
      expect(result.riskAnalysis.overallRiskLevel).toBe('LOW'); // 5% high risk
    });

    it('should generate compliance recommendations', () => {
      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Update retention policy');
      expect(result.recommendations).toContain('Review access controls');
    });

    it('should create actionable items', () => {
      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result.actionItems).toBeInstanceOf(Array);
      expect(result.actionItems.length).toBeGreaterThan(0);
      expect(result.actionItems[0]).toHaveProperty('category');
      expect(result.actionItems[0]).toHaveProperty('description');
      expect(result.actionItems[0]).toHaveProperty('priority');
      expect(result.actionItems[0]).toHaveProperty('dueDate');
    });

    it('should handle poor compliance scores', () => {
      const poorMetrics = {
        overallScore: 45,
        policyCompliance: 40,
        dataRetention: 50,
        auditReadiness: 45
      };

      const result = service.buildComplianceReport(poorMetrics, mockPolicyData, mockAuditData, mockRiskData);

      expect(result.complianceOverview.status).toBe('POOR'); // Score < 60
      expect(result.actionItems).toContain(
        expect.objectContaining({
          priority: 'HIGH',
          category: 'compliance_improvement'
        })
      );
    });

    it('should handle high risk scenarios', () => {
      const highRiskData = {
        highRisk: 40,
        mediumRisk: 35,
        lowRisk: 25,
        recommendations: ['Immediate action required', 'Review all policies']
      };

      const result = service.buildComplianceReport(mockMetrics, mockPolicyData, mockAuditData, highRiskData);

      expect(result.riskAnalysis.overallRiskLevel).toBe('HIGH'); // 40% high risk
      expect(result.actionItems).toContain(
        expect.objectContaining({
          priority: 'CRITICAL',
          category: 'risk_mitigation'
        })
      );
    });
  });

  describe('Helper Methods', () => {
    it('should calculate percentage correctly', () => {
      expect(service['calculatePercentage'](25, 100)).toBe(25);
      expect(service['calculatePercentage'](1, 3)).toBeCloseTo(33.33, 2);
      expect(service['calculatePercentage'](0, 100)).toBe(0);
    });

    it('should handle division by zero', () => {
      expect(service['calculatePercentage'](25, 0)).toBe(0);
    });

    it('should determine risk level correctly', () => {
      expect(service['determineRiskLevel'](0.95)).toBe('HIGH');
      expect(service['determineRiskLevel'](0.75)).toBe('MEDIUM');
      expect(service['determineRiskLevel'](0.45)).toBe('LOW');
      expect(service['determineRiskLevel'](0)).toBe('LOW');
    });

    it('should format change type correctly', () => {
      expect(service['getChangeType'](5)).toBe('positive');
      expect(service['getChangeType'](-3)).toBe('negative');
      expect(service['getChangeType'](0)).toBe('neutral');
    });

    it('should generate insights based on patterns', () => {
      const metrics = {
        totalDatasets: { value: 100, change: 20 },
        totalFindings: { value: 500, change: -50 },
        averageConfidence: { value: 0.95, change: 0.1 },
        highRiskFindings: { value: 5, change: -10 }
      };

      const insights = service['generateInsights'](metrics, [], []);

      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
      expect(insights).toContain(
        expect.objectContaining({
          type: 'performance_trend',
          severity: 'INFO'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle null data gracefully', () => {
      expect(() => service.buildOverviewReport(null, null, null)).not.toThrow();
      expect(() => service.buildPiiAnalysisReport(null, null, null)).not.toThrow();
      expect(() => service.buildComplianceReport(null, null, null, null)).not.toThrow();
    });

    it('should handle undefined data gracefully', () => {
      expect(() => service.buildOverviewReport(undefined, undefined, undefined)).not.toThrow();
      expect(() => service.buildPiiAnalysisReport(undefined, undefined, undefined)).not.toThrow();
      expect(() => service.buildComplianceReport(undefined, undefined, undefined, undefined)).not.toThrow();
    });

    it('should validate input data types', () => {
      expect(() => service.buildOverviewReport('invalid' as any, [], [])).toThrow(BadRequestException);
      expect(() => service.buildPiiAnalysisReport([], 'invalid' as any, [])).toThrow(BadRequestException);
      const invalidMetrics = { overallScore: 0, policyCompliance: 0, dataRetention: 0, auditReadiness: 0 };
      expect(() => service.buildComplianceReport(invalidMetrics, [], 'invalid' as any, { highRisk: 0, mediumRisk: 0, lowRisk: 0, recommendations: [] })).toThrow(BadRequestException);
    });
  });
});