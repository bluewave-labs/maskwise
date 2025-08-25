import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../reports.controller';
import { ReportsService } from '../reports.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'user@test.com',
    role: 'ADMIN'
  };

  const mockRequest = {
    user: mockUser,
    get: jest.fn().mockReturnValue('test-correlation-id')
  } as any;

  const mockOverviewData = {
    metrics: {
      totalDatasets: { value: 100, change: 5 },
      totalFindings: { value: 500, change: 10 },
      averageConfidence: { value: 0.85, change: 0.05 },
      highRiskFindings: { value: 25, change: -2 }
    },
    processingTrends: [
      { date: '2024-01-01', datasets: 10, findings: 50, avgConfidence: 0.8 }
    ],
    piiDistribution: [
      { entityType: 'EMAIL_ADDRESS', count: 200, percentage: 40 }
    ]
  };

  const mockPiiAnalysisData = {
    entityBreakdown: [
      { entityType: 'EMAIL_ADDRESS', count: 200, avgConfidence: 0.9 }
    ],
    confidenceDistribution: [
      { range: '0.8-0.9', count: 100, percentage: 50 }
    ],
    fileTypeAnalysis: [
      { fileType: 'TXT', totalFiles: 50, avgFindings: 10 }
    ],
    trends: [
      { date: '2024-01-01', findings: 100, avgConfidence: 0.85 }
    ]
  };

  const mockComplianceData = {
    complianceMetrics: {
      overallScore: 85,
      policyCompliance: 90,
      dataRetention: 80,
      auditReadiness: 85
    },
    policyEffectiveness: [
      { policyName: 'GDPR Policy', applicableFindings: 100, processedFindings: 95 }
    ],
    auditTrail: {
      recentActivities: [
        { action: 'POLICY_UPDATED', timestamp: new Date(), user: 'admin' }
      ],
      complianceEvents: [
        { event: 'Data Processing', count: 50, date: '2024-01-01' }
      ]
    },
    riskAssessment: {
      highRisk: 5,
      mediumRisk: 15,
      lowRisk: 80,
      recommendations: ['Update retention policy']
    }
  };

  const mockReportsService = {
    getOverviewData: jest.fn(),
    getPIIAnalysisData: jest.fn(),
    getComplianceData: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService
        }
      ]
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true)
    })
    .compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should get overview data successfully', async () => {
      const query = { dateRange: '30d' };
      mockReportsService.getOverviewData.mockResolvedValue(mockOverviewData);

      const result = await controller.getOverview(mockRequest, query);

      expect(result).toEqual(mockOverviewData);
      expect(service.getOverviewData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle different date ranges', async () => {
      const query = { dateRange: '7d', projectId: 'project-123' };
      mockReportsService.getOverviewData.mockResolvedValue(mockOverviewData);

      await controller.getOverview(mockRequest, query);

      expect(service.getOverviewData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle service errors', async () => {
      const query = { dateRange: '30d' };
      mockReportsService.getOverviewData.mockRejectedValue(new Error('Service error'));

      await expect(controller.getOverview(mockRequest, query)).rejects.toThrow('Service error');
    });

    it('should handle invalid date range', async () => {
      const query = { dateRange: 'invalid' };
      mockReportsService.getOverviewData.mockRejectedValue(
        new BadRequestException('Invalid date range')
      );

      await expect(controller.getOverview(mockRequest, query)).rejects.toThrow(BadRequestException);
    });

    it('should work with no query parameters', async () => {
      mockReportsService.getOverviewData.mockResolvedValue(mockOverviewData);

      await controller.getOverview(mockRequest, {});

      expect(service.getOverviewData).toHaveBeenCalledWith(mockUserId, {});
    });

    it('should handle missing user in request', async () => {
      const requestWithoutUser = { user: null, get: jest.fn() } as any;
      
      await expect(controller.getOverview(requestWithoutUser, {})).rejects.toThrow();
    });
  });

  describe('getPiiAnalysis', () => {
    it('should get PII analysis data successfully', async () => {
      const query = { 
        dateRange: '30d',
        entityTypes: ['EMAIL_ADDRESS', 'SSN'],
        minConfidence: 0.8
      };
      mockReportsService.getPIIAnalysisData.mockResolvedValue(mockPiiAnalysisData);

      const result = await controller.getPIIAnalysis(mockRequest, query);

      expect(result).toEqual(mockPiiAnalysisData);
      expect(service.getPIIAnalysisData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle entity type filtering', async () => {
      const query = { entityTypes: ['EMAIL_ADDRESS'] };
      mockReportsService.getPIIAnalysisData.mockResolvedValue(mockPiiAnalysisData);

      await controller.getPIIAnalysis(mockRequest, query);

      expect(service.getPIIAnalysisData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle confidence threshold filtering', async () => {
      const query = { minConfidence: 0.9, maxConfidence: 1.0 };
      mockReportsService.getPIIAnalysisData.mockResolvedValue(mockPiiAnalysisData);

      await controller.getPIIAnalysis(mockRequest, query);

      expect(service.getPIIAnalysisData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle file type filtering', async () => {
      const query = { fileTypes: ['PDF', 'DOCX'] };
      mockReportsService.getPIIAnalysisData.mockResolvedValue(mockPiiAnalysisData);

      await controller.getPIIAnalysis(mockRequest, query);

      expect(service.getPIIAnalysisData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle project-specific analysis', async () => {
      const query = { projectId: 'project-123', includeArchived: false };
      mockReportsService.getPIIAnalysisData.mockResolvedValue(mockPiiAnalysisData);

      await controller.getPIIAnalysis(mockRequest, query);

      expect(service.getPIIAnalysisData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle service errors gracefully', async () => {
      const query = { dateRange: '30d' };
      mockReportsService.getPIIAnalysisData.mockRejectedValue(new Error('Analysis failed'));

      await expect(controller.getPIIAnalysis(mockRequest, query)).rejects.toThrow('Analysis failed');
    });

    it('should validate confidence range', async () => {
      const query = { minConfidence: 1.5 };
      mockReportsService.getPIIAnalysisData.mockRejectedValue(
        new BadRequestException('Invalid confidence range')
      );

      await expect(controller.getPIIAnalysis(mockRequest, query)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty results', async () => {
      const query = { dateRange: '1d' };
      const emptyResult = {
        entityBreakdown: [],
        confidenceDistribution: [],
        fileTypeAnalysis: [],
        trends: []
      };
      mockReportsService.getPIIAnalysisData.mockResolvedValue(emptyResult);

      const result = await controller.getPIIAnalysis(mockRequest, query);

      expect(result).toEqual(emptyResult);
    });
  });

  describe('getComplianceData', () => {
    it('should get compliance data successfully', async () => {
      const query = { 
        dateRange: '30d',
        policies: ['policy-123'],
        includeAuditTrail: true
      };
      mockReportsService.getComplianceData.mockResolvedValue(mockComplianceData);

      const result = await controller.getComplianceData(mockRequest, query);

      expect(result).toEqual(mockComplianceData);
      expect(service.getComplianceData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle policy-specific compliance', async () => {
      const query = { policies: ['gdpr-policy', 'hipaa-policy'] };
      mockReportsService.getComplianceData.mockResolvedValue(mockComplianceData);

      await controller.getComplianceData(mockRequest, query);

      expect(service.getComplianceData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle audit trail inclusion', async () => {
      const query = { includeAuditTrail: true, auditDepth: 100 };
      mockReportsService.getComplianceData.mockResolvedValue(mockComplianceData);

      await controller.getComplianceData(mockRequest, query);

      expect(service.getComplianceData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle risk assessment filtering', async () => {
      const query = { riskLevels: ['HIGH', 'MEDIUM'] };
      mockReportsService.getComplianceData.mockResolvedValue(mockComplianceData);

      await controller.getComplianceData(mockRequest, query);

      expect(service.getComplianceData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle department-specific compliance', async () => {
      const query = { departments: ['HR', 'Finance'], includeMetrics: true };
      mockReportsService.getComplianceData.mockResolvedValue(mockComplianceData);

      await controller.getComplianceData(mockRequest, query);

      expect(service.getComplianceData).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should handle service authorization errors', async () => {
      const query = { dateRange: '30d' };
      mockReportsService.getComplianceData.mockRejectedValue(
        new UnauthorizedException('Insufficient permissions')
      );

      await expect(controller.getComplianceData(mockRequest, query)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle invalid policy IDs', async () => {
      const query = { policies: ['invalid-policy-id'] };
      mockReportsService.getComplianceData.mockRejectedValue(
        new BadRequestException('Invalid policy ID')
      );

      await expect(controller.getComplianceData(mockRequest, query)).rejects.toThrow(BadRequestException);
    });

    it('should handle compliance score calculation errors', async () => {
      const query = { dateRange: '30d' };
      mockReportsService.getComplianceData.mockRejectedValue(
        new Error('Score calculation failed')
      );

      await expect(controller.getComplianceData(mockRequest, query)).rejects.toThrow('Score calculation failed');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', () => {
      // Verify that JwtAuthGuard is properly applied
      const guards = Reflect.getMetadata('__guards__', ReportsController);
      expect(guards).toBeDefined();
    });

    it('should extract user ID from authenticated request', async () => {
      const customRequest = {
        user: { id: 'custom-user-id', email: 'custom@test.com' },
        get: jest.fn().mockReturnValue('custom-correlation-id')
      } as any;
      
      mockReportsService.getOverviewData.mockResolvedValue(mockOverviewData);

      await controller.getOverview(customRequest, {});

      expect(service.getOverviewData).toHaveBeenCalledWith('custom-user-id', {});
    });

    it('should handle malformed user object', async () => {
      const malformedRequest = {
        user: { email: 'test@example.com' }, // Missing ID
        get: jest.fn()
      } as any;

      await expect(controller.getOverview(malformedRequest, {})).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = new Error('Database connection failed');
      mockReportsService.getOverviewData.mockRejectedValue(serviceError);

      await expect(controller.getOverview(mockRequest, {})).rejects.toThrow('Database connection failed');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockReportsService.getPIIAnalysisData.mockRejectedValue(timeoutError);

      await expect(controller.getPIIAnalysis(mockRequest, {})).rejects.toThrow('Request timeout');
    });

    it('should handle validation errors', async () => {
      const validationError = new BadRequestException('Invalid query parameters');
      mockReportsService.getComplianceData.mockRejectedValue(validationError);

      await expect(controller.getComplianceData(mockRequest, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('Query Parameter Handling', () => {
    it('should handle complex query combinations for overview', async () => {
      const complexQuery = {
        dateRange: '90d',
        projectId: 'proj-123',
        includeArchived: true,
        groupBy: 'month',
        sortBy: 'date',
        sortOrder: 'desc'
      };
      mockReportsService.getOverviewData.mockResolvedValue(mockOverviewData);

      await controller.getOverview(mockRequest, complexQuery);

      expect(service.getOverviewData).toHaveBeenCalledWith(mockUserId, complexQuery);
    });

    it('should handle array parameters for PII analysis', async () => {
      const arrayQuery = {
        entityTypes: ['EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD'],
        fileTypes: ['PDF', 'DOCX', 'TXT'],
        projects: ['proj-1', 'proj-2']
      };
      mockReportsService.getPIIAnalysisData.mockResolvedValue(mockPiiAnalysisData);

      await controller.getPIIAnalysis(mockRequest, arrayQuery);

      expect(service.getPIIAnalysisData).toHaveBeenCalledWith(mockUserId, arrayQuery);
    });

    it('should handle boolean parameters for compliance', async () => {
      const booleanQuery = {
        includeAuditTrail: false,
        includeMetrics: true,
        includeRecommendations: true,
        onlyHighRisk: false
      };
      mockReportsService.getComplianceData.mockResolvedValue(mockComplianceData);

      await controller.getComplianceData(mockRequest, booleanQuery);

      expect(service.getComplianceData).toHaveBeenCalledWith(mockUserId, booleanQuery);
    });
  });
});