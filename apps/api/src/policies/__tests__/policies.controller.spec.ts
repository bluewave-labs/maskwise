import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PoliciesController } from '../policies.controller';
import { PoliciesService, CreatePolicyDto, UpdatePolicyDto } from '../services/policies.service';
import { ValidationResult } from '../services/yaml-validation.service';

// Mock PoliciesService
const mockPoliciesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getTemplates: jest.fn(),
  createFromTemplate: jest.fn(),
  validateYaml: jest.fn(),
};

describe('PoliciesController', () => {
  let controller: PoliciesController;
  let service: typeof mockPoliciesService;

  const mockUserId = 'user-123';
  const mockPolicyId = 'policy-123';
  const mockTemplateId = 'template-123';

  const mockRequest = {
    user: {
      id: mockUserId,
      email: 'admin@example.com',
      role: 'ADMIN',
    },
  };

  const mockPolicy = {
    id: mockPolicyId,
    name: 'Test Policy',
    description: 'A test policy',
    config: {},
    version: '1.0.0',
    isActive: true,
    isDefault: false,
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
    versions: [],
    _count: { versions: 1 }
  };

  const mockPoliciesResponse = {
    policies: [mockPolicy],
    total: 1,
    pages: 1
  };

  const mockTemplates = [
    {
      id: 'template-1',
      name: 'GDPR Compliance',
      description: 'GDPR template',
      category: 'GDPR',
      config: {},
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z')
    },
    {
      id: 'template-2',
      name: 'HIPAA Compliance',
      description: 'HIPAA template',
      category: 'HIPAA',
      config: {},
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z')
    }
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoliciesController],
      providers: [
        {
          provide: PoliciesService,
          useValue: mockPoliciesService,
        },
      ],
    }).compile();

    controller = module.get<PoliciesController>(PoliciesController);
    service = module.get(PoliciesService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return policies with default pagination', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(mockPoliciesResponse);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('should handle custom pagination parameters', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(mockRequest, '2', '50', 'test', 'true');

      expect(service.findAll).toHaveBeenCalledWith(2, 50, 'test', true);
    });

    it('should handle string to number conversion for pagination', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(mockRequest, '3', '25');

      expect(service.findAll).toHaveBeenCalledWith(3, 25, undefined, undefined);
    });

    it('should handle invalid page parameter', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      // parseInt('invalid') returns NaN, which gets passed through
      await controller.findAll(mockRequest, 'invalid');

      expect(service.findAll).toHaveBeenCalledWith(NaN, 20, undefined, undefined);
    });

    it('should handle invalid limit parameter', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(mockRequest, '1', 'invalid');

      expect(service.findAll).toHaveBeenCalledWith(1, NaN, undefined, undefined);
    });

    it('should parse boolean isActive parameter correctly', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      // Test 'true' string
      await controller.findAll(mockRequest, '1', '20', undefined, 'true');
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, true);

      // Test 'false' string
      await controller.findAll(mockRequest, '1', '20', undefined, 'false');
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, false);

      // Test other values (should be false)
      await controller.findAll(mockRequest, '1', '20', undefined, 'anything');
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, false);
    });

    it('should handle search parameter', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(mockRequest, '1', '20', 'GDPR compliance');

      expect(service.findAll).toHaveBeenCalledWith(1, 20, 'GDPR compliance', undefined);
    });

    it('should handle all parameters together', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(mockRequest, '2', '30', 'search term', 'true');

      expect(service.findAll).toHaveBeenCalledWith(2, 30, 'search term', true);
    });

    it('should use default values when parameters are undefined', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(mockRequest, undefined, undefined, undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });
  });

  describe('getTemplates', () => {
    it('should return policy templates', async () => {
      service.getTemplates.mockResolvedValue(mockTemplates);

      const result = await controller.getTemplates();

      expect(result).toEqual(mockTemplates);
      expect(service.getTemplates).toHaveBeenCalledWith();
    });

    it('should handle empty templates', async () => {
      service.getTemplates.mockResolvedValue([]);

      const result = await controller.getTemplates();

      expect(result).toEqual([]);
    });
  });

  describe('validateYaml', () => {
    it('should validate YAML successfully', async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: {} as any
      };

      service.validateYaml.mockResolvedValue(validationResult);

      const result = await controller.validateYaml('valid yaml content');

      expect(result).toEqual(validationResult);
      expect(service.validateYaml).toHaveBeenCalledWith('valid yaml content');
    });

    it('should return validation errors', async () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: ['Invalid entity type', 'Missing required field']
      };

      service.validateYaml.mockResolvedValue(validationResult);

      const result = await controller.validateYaml('invalid yaml');

      expect(result).toEqual(validationResult);
    });

    it('should handle YAML with business rule warnings', async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: {} as any,
        errors: ['Low confidence threshold detected']
      };

      service.validateYaml.mockResolvedValue(validationResult);

      const result = await controller.validateYaml('yaml with warnings');

      expect(result).toEqual(validationResult);
    });
  });

  describe('findOne', () => {
    it('should return policy by ID', async () => {
      service.findOne.mockResolvedValue(mockPolicy);

      const result = await controller.findOne(mockPolicyId);

      expect(result).toEqual(mockPolicy);
      expect(service.findOne).toHaveBeenCalledWith(mockPolicyId);
    });

    it('should handle policy not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Policy not found'));

      await expect(controller.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Policy not found')
      );
    });
  });

  describe('create', () => {
    const createDto: CreatePolicyDto = {
      name: 'New Policy',
      description: 'A new test policy',
      yamlContent: 'name: New Policy\nversion: 1.0.0\n...',
      tags: ['test'],
      isActive: true
    };

    it('should create policy successfully', async () => {
      service.create.mockResolvedValue(mockPolicy);

      const result = await controller.create(mockRequest, createDto);

      expect(result).toEqual(mockPolicy);
      expect(service.create).toHaveBeenCalledWith(mockUserId, createDto);
    });

    it('should handle creation with invalid YAML', async () => {
      service.create.mockRejectedValue(
        new BadRequestException({
          message: 'Invalid policy YAML',
          errors: ['Invalid format']
        })
      );

      await expect(controller.create(mockRequest, createDto)).rejects.toThrow(
        new BadRequestException({
          message: 'Invalid policy YAML',
          errors: ['Invalid format']
        })
      );
    });

    it('should handle name conflict', async () => {
      service.create.mockRejectedValue(
        new ConflictException('Policy with this name already exists')
      );

      await expect(controller.create(mockRequest, createDto)).rejects.toThrow(
        new ConflictException('Policy with this name already exists')
      );
    });

    it('should pass user ID from request', async () => {
      const customRequest = {
        user: { id: 'different-user-id', role: 'ADMIN' }
      };

      service.create.mockResolvedValue(mockPolicy);

      await controller.create(customRequest as any, createDto);

      expect(service.create).toHaveBeenCalledWith('different-user-id', createDto);
    });
  });

  describe('createFromTemplate', () => {
    it('should create policy from template successfully', async () => {
      service.createFromTemplate.mockResolvedValue(mockPolicy);

      const result = await controller.createFromTemplate(
        mockRequest,
        mockTemplateId,
        { name: 'Policy from Template' }
      );

      expect(result).toEqual(mockPolicy);
      expect(service.createFromTemplate).toHaveBeenCalledWith(
        mockUserId,
        mockTemplateId,
        'Policy from Template'
      );
    });

    it('should handle template not found', async () => {
      service.createFromTemplate.mockRejectedValue(
        new NotFoundException('Policy template not found')
      );

      await expect(
        controller.createFromTemplate(mockRequest, 'non-existent', { name: 'Test' })
      ).rejects.toThrow(new NotFoundException('Policy template not found'));
    });

    it('should handle name conflicts when creating from template', async () => {
      service.createFromTemplate.mockRejectedValue(
        new ConflictException('Policy with this name already exists')
      );

      await expect(
        controller.createFromTemplate(mockRequest, mockTemplateId, { name: 'Existing Name' })
      ).rejects.toThrow(new ConflictException('Policy with this name already exists'));
    });
  });

  describe('update', () => {
    const updateDto: UpdatePolicyDto = {
      name: 'Updated Policy',
      description: 'Updated description',
      yamlContent: 'updated yaml content',
      isActive: false
    };

    it('should update policy successfully', async () => {
      const updatedPolicy = { ...mockPolicy, ...updateDto };
      service.update.mockResolvedValue(updatedPolicy);

      const result = await controller.update(mockRequest, mockPolicyId, updateDto);

      expect(result).toEqual(updatedPolicy);
      expect(service.update).toHaveBeenCalledWith(mockUserId, mockPolicyId, updateDto);
    });

    it('should handle policy not found on update', async () => {
      service.update.mockRejectedValue(new NotFoundException('Policy not found'));

      await expect(
        controller.update(mockRequest, 'non-existent', updateDto)
      ).rejects.toThrow(new NotFoundException('Policy not found'));
    });

    it('should handle invalid YAML on update', async () => {
      service.update.mockRejectedValue(
        new BadRequestException({
          message: 'Invalid policy YAML',
          errors: ['Syntax error']
        })
      );

      await expect(
        controller.update(mockRequest, mockPolicyId, updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle name conflict on update', async () => {
      service.update.mockRejectedValue(
        new ConflictException('Policy with this name already exists')
      );

      await expect(
        controller.update(mockRequest, mockPolicyId, updateDto)
      ).rejects.toThrow(new ConflictException('Policy with this name already exists'));
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { name: 'New Name Only' };
      service.update.mockResolvedValue({ ...mockPolicy, name: 'New Name Only' });

      const result = await controller.update(mockRequest, mockPolicyId, partialUpdate);

      expect(service.update).toHaveBeenCalledWith(mockUserId, mockPolicyId, partialUpdate);
      expect(result.name).toBe('New Name Only');
    });
  });

  describe('delete', () => {
    it('should delete policy successfully', async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(mockRequest, mockPolicyId);

      expect(service.delete).toHaveBeenCalledWith(mockUserId, mockPolicyId);
    });

    it('should handle policy not found on delete', async () => {
      service.delete.mockRejectedValue(new NotFoundException('Policy not found'));

      await expect(
        controller.delete(mockRequest, 'non-existent')
      ).rejects.toThrow(new NotFoundException('Policy not found'));
    });

    it('should return void on successful deletion', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockRequest, mockPolicyId);

      expect(result).toBeUndefined();
    });

    it('should pass correct user ID to service', async () => {
      const customRequest = {
        user: { id: 'custom-user-id', role: 'ADMIN' }
      };

      service.delete.mockResolvedValue(undefined);

      await controller.delete(customRequest as any, mockPolicyId);

      expect(service.delete).toHaveBeenCalledWith('custom-user-id', mockPolicyId);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors for findAll', async () => {
      const dbError = new Error('Database connection failed');
      service.findAll.mockRejectedValue(dbError);

      await expect(controller.findAll(mockRequest)).rejects.toThrow(dbError);
    });

    it('should propagate service errors for validation', async () => {
      const validationError = new Error('Validation service error');
      service.validateYaml.mockRejectedValue(validationError);

      await expect(controller.validateYaml('test yaml')).rejects.toThrow(validationError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      service.getTemplates.mockRejectedValue(timeoutError);

      await expect(controller.getTemplates()).rejects.toThrow(timeoutError);
    });
  });

  describe('Request Context', () => {
    it('should extract user ID from different request structures', async () => {
      const adminRequest = {
        user: {
          id: 'admin-user-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        }
      };

      service.create.mockResolvedValue(mockPolicy);

      await controller.create(adminRequest as any, {
        name: 'Test',
        description: 'Test',
        yamlContent: 'test'
      });

      expect(service.create).toHaveBeenCalledWith('admin-user-123', expect.any(Object));
    });

    it('should work with different user roles', async () => {
      // Note: The controller itself doesn't validate roles, that's done by guards
      const memberRequest = {
        user: {
          id: 'member-123',
          role: 'MEMBER'
        }
      };

      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(memberRequest as any);

      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('Parameter Validation', () => {
    it('should handle extreme pagination values', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      // Test with very large numbers
      await controller.findAll(mockRequest, '999999', '999999');

      expect(service.findAll).toHaveBeenCalledWith(999999, 999999, undefined, undefined);
    });

    it('should handle empty string parameters', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      await controller.findAll(mockRequest, '', '', '', '');

      // Empty strings are falsy, so they use default values for page/limit
      expect(service.findAll).toHaveBeenCalledWith(1, 20, '', false);
    });

    it('should handle special characters in search', async () => {
      service.findAll.mockResolvedValue(mockPoliciesResponse);

      const specialSearchTerm = 'test@#$%^&*()[]{}|\\:";\'<>?,./';
      await controller.findAll(mockRequest, '1', '20', specialSearchTerm);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, specialSearchTerm, undefined);
    });
  });
});