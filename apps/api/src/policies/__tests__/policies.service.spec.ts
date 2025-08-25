import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PoliciesService, CreatePolicyDto, UpdatePolicyDto } from '../services/policies.service';
import { YamlValidationService, ValidationResult } from '../services/yaml-validation.service';
import { PrismaService } from '../../common/prisma.service';
import { PolicyYAML } from '../schemas/policy.schema';

// Mock PrismaService
const mockPrismaService = {
  policy: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  policyVersion: {
    create: jest.fn(),
    update: jest.fn(),
  },
  policyTemplate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock YamlValidationService
const mockYamlValidationService = {
  validateYAML: jest.fn(),
  toYAML: jest.fn(),
  validateBusinessRules: jest.fn(),
};

describe('PoliciesService', () => {
  let service: PoliciesService;
  let prisma: typeof mockPrismaService;
  let yamlValidation: typeof mockYamlValidationService;

  const mockUserId = 'user-123';
  const mockPolicyId = 'policy-123';
  const mockTemplateId = 'template-123';

  const mockValidYaml: PolicyYAML = {
    name: 'Test Policy',
    version: '1.0.0',
    description: 'A test policy for unit testing',
    detection: {
      entities: [
        { type: 'EMAIL_ADDRESS', confidence_threshold: 0.9, action: 'redact' },
        { type: 'PHONE_NUMBER', confidence_threshold: 0.8, action: 'replace', replacement: '[PHONE]' }
      ]
    },
    scope: {
      file_types: ['txt', 'csv', 'pdf'],
      max_file_size: '100MB'
    },
    anonymization: {
      default_action: 'redact',
      preserve_format: true,
      audit_trail: true
    }
  };

  const mockPolicy = {
    id: mockPolicyId,
    name: 'Test Policy',
    description: 'A test policy',
    config: JSON.parse(JSON.stringify(mockValidYaml)), // Convert to JsonValue
    version: '1.0.0',
    isActive: true,
    isDefault: false,
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
    versions: [
      {
        id: 'version-1',
        policyId: mockPolicyId,
        version: '1.0.0',
        config: JSON.parse(JSON.stringify(mockValidYaml)), // Convert to JsonValue
        changelog: 'Initial version',
        isActive: true,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      }
    ],
    _count: {
      versions: 1
    }
  };

  const mockPolicyList = [
    {
      ...mockPolicy,
      versions: [mockPolicy.versions[0]],
    },
    {
      ...mockPolicy,
      id: 'policy-2',
      name: 'Another Policy',
      versions: [{
        ...mockPolicy.versions[0],
        id: 'version-2',
        policyId: 'policy-2',
      }],
    }
  ] as any[];

  const mockTemplate = {
    id: mockTemplateId,
    name: 'GDPR Compliance',
    description: 'GDPR compliance template',
    category: 'GDPR',
    config: {
      entities: ['EMAIL_ADDRESS', 'PERSON', 'PHONE_NUMBER'],
      confidence_threshold: 0.9,
      anonymization: {
        default_anonymizer: 'redact'
      }
    },
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z')
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: YamlValidationService,
          useValue: mockYamlValidationService,
        },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    prisma = module.get(PrismaService);
    yamlValidation = module.get(YamlValidationService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return policies with default pagination', async () => {
      prisma.policy.findMany.mockResolvedValue(mockPolicyList);
      prisma.policy.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result).toEqual({
        policies: mockPolicyList,
        total: 2,
        pages: 1
      });

      expect(prisma.policy.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { versions: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle custom pagination', async () => {
      prisma.policy.findMany.mockResolvedValue([]);
      prisma.policy.count.mockResolvedValue(15);

      const result = await service.findAll(2, 5);

      expect(result.pages).toBe(3); // Math.ceil(15 / 5)
      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page - 1) * limit
          take: 5,
        })
      );
    });

    it('should filter by search query', async () => {
      prisma.policy.findMany.mockResolvedValue([]);
      prisma.policy.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'GDPR');

      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'GDPR', mode: 'insensitive' } },
              { description: { contains: 'GDPR', mode: 'insensitive' } }
            ]
          },
        })
      );
    });

    it('should filter by active status', async () => {
      prisma.policy.findMany.mockResolvedValue([]);
      prisma.policy.count.mockResolvedValue(0);

      await service.findAll(1, 20, undefined, true);

      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true
          },
        })
      );
    });

    it('should combine search and active filters', async () => {
      prisma.policy.findMany.mockResolvedValue([]);
      prisma.policy.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'compliance', false);

      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'compliance', mode: 'insensitive' } },
              { description: { contains: 'compliance', mode: 'insensitive' } }
            ],
            isActive: false
          },
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return policy with all versions', async () => {
      prisma.policy.findUnique.mockResolvedValue(mockPolicy);

      const result = await service.findOne(mockPolicyId);

      expect(result).toEqual(mockPolicy);
      expect(prisma.policy.findUnique).toHaveBeenCalledWith({
        where: { id: mockPolicyId },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { versions: true }
          }
        }
      });
    });

    it('should throw NotFoundException when policy not found', async () => {
      prisma.policy.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
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
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      yamlValidation.validateYAML.mockReturnValue(validationResult);
      prisma.policy.findFirst.mockResolvedValue(null); // No name conflict
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          policy: {
            create: jest.fn().mockResolvedValue(mockPolicy),
          },
          policyVersion: {
            create: jest.fn().mockResolvedValue({}),
          }
        });
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(mockPolicy);
      expect(yamlValidation.validateYAML).toHaveBeenCalledWith(createDto.yamlContent);
      expect(prisma.policy.findFirst).toHaveBeenCalledWith({
        where: { name: createDto.name }
      });
    });

    it('should throw BadRequestException for invalid YAML', async () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: ['Invalid YAML format']
      };

      yamlValidation.validateYAML.mockReturnValue(validationResult);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        new BadRequestException({
          message: 'Invalid policy YAML',
          errors: ['Invalid YAML format']
        })
      );
    });

    it('should throw ConflictException for duplicate policy name', async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      yamlValidation.validateYAML.mockReturnValue(validationResult);
      prisma.policy.findFirst.mockResolvedValue(mockPolicy); // Name conflict

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        new ConflictException('Policy with this name already exists')
      );
    });

    it('should create audit log entry', async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      yamlValidation.validateYAML.mockReturnValue(validationResult);
      prisma.policy.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          policy: {
            create: jest.fn().mockResolvedValue(mockPolicy),
          },
          policyVersion: {
            create: jest.fn().mockResolvedValue({}),
          }
        });
      });
      prisma.auditLog.create.mockResolvedValue({});

      await service.create(mockUserId, createDto);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          action: 'CREATE',
          resource: 'Policy',
          resourceId: mockPolicy.id,
          details: {
            policyName: mockPolicy.name,
            yamlValidation: true
          }
        }
      });
    });

    it('should default isActive to true when not specified', async () => {
      const createDtoWithoutActive = { ...createDto, isActive: undefined };
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      yamlValidation.validateYAML.mockReturnValue(validationResult);
      prisma.policy.findFirst.mockResolvedValue(null);
      
      const mockCreatePolicy = jest.fn().mockResolvedValue(mockPolicy);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          policy: { create: mockCreatePolicy },
          policyVersion: { create: jest.fn().mockResolvedValue({}) }
        });
      });
      prisma.auditLog.create.mockResolvedValue({});

      await service.create(mockUserId, createDtoWithoutActive);

      expect(mockCreatePolicy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true // Should default to true
        })
      });
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
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      prisma.policy.findUnique.mockResolvedValue(mockPolicy);
      yamlValidation.validateYAML.mockReturnValue(validationResult);
      prisma.policy.findFirst.mockResolvedValue(null); // No name conflict

      const mockUpdatePolicy = jest.fn().mockResolvedValue({ ...mockPolicy, ...updateDto });
      const mockUpdateVersion = jest.fn().mockResolvedValue({});
      const mockCreateVersion = jest.fn().mockResolvedValue({});

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          policy: { update: mockUpdatePolicy },
          policyVersion: { 
            update: mockUpdateVersion,
            create: mockCreateVersion
          }
        });
      });

      prisma.auditLog.create.mockResolvedValue({});
      // Mock the recursive call to findOne
      jest.spyOn(service, 'findOne').mockResolvedValue(mockPolicy as any);

      const result = await service.update(mockUserId, mockPolicyId, updateDto);

      expect(result).toEqual(mockPolicy);
      expect(yamlValidation.validateYAML).toHaveBeenCalledWith(updateDto.yamlContent);
    });

    it('should throw BadRequestException for invalid YAML', async () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: ['Invalid YAML']
      };

      prisma.policy.findUnique.mockResolvedValue(mockPolicy);
      yamlValidation.validateYAML.mockReturnValue(validationResult);

      await expect(service.update(mockUserId, mockPolicyId, updateDto)).rejects.toThrow(
        new BadRequestException({
          message: 'Invalid policy YAML',
          errors: ['Invalid YAML']
        })
      );
    });

    it('should throw ConflictException for duplicate name', async () => {
      const updateDtoWithName = { name: 'Existing Policy Name' };
      
      prisma.policy.findUnique.mockResolvedValue(mockPolicy);
      prisma.policy.findFirst.mockResolvedValue({ id: 'other-policy', name: 'Existing Policy Name' });

      await expect(service.update(mockUserId, mockPolicyId, updateDtoWithName)).rejects.toThrow(
        new ConflictException('Policy with this name already exists')
      );
    });

    it('should create new version when YAML content changes', async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      prisma.policy.findUnique.mockResolvedValue(mockPolicy);
      yamlValidation.validateYAML.mockReturnValue(validationResult);
      prisma.policy.findFirst.mockResolvedValue(null);

      const mockUpdateVersion = jest.fn().mockResolvedValue({});
      const mockCreateVersion = jest.fn().mockResolvedValue({});

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          policy: { update: jest.fn().mockResolvedValue(mockPolicy) },
          policyVersion: { 
            update: mockUpdateVersion,
            create: mockCreateVersion
          }
        });
      });

      prisma.auditLog.create.mockResolvedValue({});
      jest.spyOn(service, 'findOne').mockResolvedValue(mockPolicy as any);

      await service.update(mockUserId, mockPolicyId, updateDto);

      // Should deactivate previous version
      expect(mockUpdateVersion).toHaveBeenCalledWith({
        where: { id: mockPolicy.versions[0].id },
        data: { isActive: false }
      });

      // Should create new version with incremented minor version
      expect(mockCreateVersion).toHaveBeenCalledWith({
        data: {
          policyId: mockPolicy.id,
          version: '1.1.0', // Incremented minor version
          config: expect.any(Object),
          changelog: 'Policy updated',
          isActive: true
        }
      });
    });

    it('should not create new version when only metadata changes', async () => {
      const metadataOnlyUpdate = { name: 'New Name', description: 'New Description' };
      
      prisma.policy.findUnique.mockResolvedValue(mockPolicy);
      prisma.policy.findFirst.mockResolvedValue(null);

      const mockCreateVersion = jest.fn();
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          policy: { update: jest.fn().mockResolvedValue(mockPolicy) },
          policyVersion: { create: mockCreateVersion }
        });
      });

      prisma.auditLog.create.mockResolvedValue({});
      jest.spyOn(service, 'findOne').mockResolvedValue(mockPolicy as any);

      await service.update(mockUserId, mockPolicyId, metadataOnlyUpdate);

      // Should not create new version
      expect(mockCreateVersion).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete policy', async () => {
      prisma.policy.findUnique.mockResolvedValue(mockPolicy);
      prisma.policy.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await service.delete(mockUserId, mockPolicyId);

      expect(prisma.policy.update).toHaveBeenCalledWith({
        where: { id: mockPolicyId },
        data: {
          isActive: false,
          updatedAt: expect.any(Date)
        }
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          action: 'DELETE',
          resource: 'Policy',
          resourceId: mockPolicyId,
          details: {
            policyName: mockPolicy.name
          }
        }
      });
    });

    it('should throw NotFoundException when policy not found', async () => {
      prisma.policy.findUnique.mockResolvedValue(null);

      await expect(service.delete(mockUserId, 'non-existent')).rejects.toThrow(
        new NotFoundException('Policy not found')
      );
    });
  });

  describe('getTemplates', () => {
    const mockTemplates = [
      { ...mockTemplate, category: 'GDPR' },
      { ...mockTemplate, id: 'template-2', category: 'HIPAA', name: 'HIPAA Compliance' }
    ];

    it('should return all policy templates', async () => {
      prisma.policyTemplate.findMany.mockResolvedValue(mockTemplates);

      const result = await service.getTemplates();

      expect(result).toEqual(mockTemplates);
      expect(prisma.policyTemplate.findMany).toHaveBeenCalledWith({
        orderBy: { category: 'asc' }
      });
    });
  });

  describe('createFromTemplate', () => {
    it('should create policy from template successfully', async () => {
      prisma.policyTemplate.findUnique.mockResolvedValue(mockTemplate);
      yamlValidation.toYAML.mockReturnValue('yaml-content');
      
      // Mock the service.create method
      jest.spyOn(service, 'create').mockResolvedValue(mockPolicy as any);

      const result = await service.createFromTemplate(mockUserId, mockTemplateId, 'New Policy from Template');

      expect(result).toEqual(mockPolicy);
      expect(prisma.policyTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: mockTemplateId }
      });
      expect(service.create).toHaveBeenCalledWith(mockUserId, {
        name: 'New Policy from Template',
        description: 'Policy created from GDPR Compliance template',
        yamlContent: 'yaml-content',
        tags: ['gdpr']
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.policyTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.createFromTemplate(mockUserId, 'non-existent', 'New Policy')
      ).rejects.toThrow(new NotFoundException('Policy template not found'));
    });

    it('should handle template with replace action', async () => {
      const templateWithReplace = {
        ...mockTemplate,
        config: {
          entities: ['EMAIL_ADDRESS'],
          confidence_threshold: 0.8,
          anonymization: {
            default_anonymizer: 'replace',
            anonymizers: {
              replace: {
                new_value: '[REDACTED]'
              }
            }
          }
        }
      };

      prisma.policyTemplate.findUnique.mockResolvedValue(templateWithReplace);
      yamlValidation.toYAML.mockReturnValue('yaml-content');
      jest.spyOn(service, 'create').mockResolvedValue(mockPolicy as any);

      await service.createFromTemplate(mockUserId, mockTemplateId, 'Replace Policy');

      // Check that the YAML contains the replacement value
      expect(yamlValidation.toYAML).toHaveBeenCalledWith(
        expect.objectContaining({
          detection: {
            entities: expect.arrayContaining([
              expect.objectContaining({
                action: 'replace',
                replacement: '[REDACTED]'
              })
            ])
          }
        })
      );
    });
  });

  describe('validateYaml', () => {
    it('should validate YAML successfully', async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      yamlValidation.validateYAML.mockReturnValue(validationResult);
      yamlValidation.validateBusinessRules.mockReturnValue([]);

      const result = await service.validateYaml('valid yaml');

      expect(result).toEqual(validationResult);
      expect(yamlValidation.validateYAML).toHaveBeenCalledWith('valid yaml');
      expect(yamlValidation.validateBusinessRules).toHaveBeenCalledWith(mockValidYaml);
    });

    it('should return business rule warnings', async () => {
      const validationResult: ValidationResult = {
        isValid: true,
        parsed: mockValidYaml
      };

      const warnings = ['Low confidence threshold detected'];

      yamlValidation.validateYAML.mockReturnValue(validationResult);
      yamlValidation.validateBusinessRules.mockReturnValue(warnings);

      const result = await service.validateYaml('yaml with warnings');

      expect(result).toEqual({
        isValid: true,
        parsed: mockValidYaml,
        errors: warnings // Warnings are returned as errors
      });
    });

    it('should return validation errors', async () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: ['Invalid entity type']
      };

      yamlValidation.validateYAML.mockReturnValue(validationResult);

      const result = await service.validateYaml('invalid yaml');

      expect(result).toEqual(validationResult);
      expect(yamlValidation.validateBusinessRules).not.toHaveBeenCalled();
    });
  });
});