import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { YamlValidationService, ValidationResult } from '../services/yaml-validation.service';
import { PolicyYAML } from '../schemas/policy.schema';
import * as yaml from 'js-yaml';

describe('YamlValidationService', () => {
  let service: YamlValidationService;

  const validPolicyYaml: PolicyYAML = {
    name: 'Test Policy',
    version: '1.0.0',
    description: 'A comprehensive test policy',
    detection: {
      entities: [
        { type: 'EMAIL_ADDRESS', confidence_threshold: 0.9, action: 'redact' },
        { type: 'PHONE_NUMBER', confidence_threshold: 0.8, action: 'replace', replacement: '[PHONE]' },
        { type: 'CREDIT_CARD', confidence_threshold: 0.95, action: 'mask' },
        { type: 'SSN', confidence_threshold: 0.95, action: 'encrypt' }
      ]
    },
    scope: {
      file_types: ['txt', 'csv', 'pdf', 'docx'],
      max_file_size: '100MB'
    },
    anonymization: {
      default_action: 'redact',
      preserve_format: true,
      audit_trail: true
    }
  };

  const validYamlString = yaml.dump(validPolicyYaml);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YamlValidationService],
    }).compile();

    service = module.get<YamlValidationService>(YamlValidationService);
  });

  describe('validateYAML', () => {
    it('should validate correct YAML successfully', () => {
      const result = service.validateYAML(validYamlString);

      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual(validPolicyYaml);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid YAML syntax', () => {
      const invalidYaml = 'invalid: yaml: content:\n  - broken';

      const result = service.validateYAML(invalidYaml);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('YAML parsing error');
    });

    it('should reject non-object YAML', () => {
      const primitiveYaml = 'just a string';

      const result = service.validateYAML(primitiveYaml);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Invalid YAML format: Content must be a valid YAML object']);
    });

    it('should validate required fields', () => {
      const incompleteYaml = {
        name: 'Test',
        // Missing required fields
      };

      const result = service.validateYAML(yaml.dump(incompleteYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('version'),
          expect.stringContaining('description'),
          expect.stringContaining('detection')
        ])
      );
    });

    it('should validate entity types', () => {
      const invalidEntityYaml = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'INVALID_ENTITY_TYPE', confidence_threshold: 0.9, action: 'redact' }
          ]
        }
      };

      const result = service.validateYAML(yaml.dump(invalidEntityYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('must be one of')
        ])
      );
    });

    it('should validate confidence threshold range', () => {
      const invalidConfidenceYaml = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 1.5, action: 'redact' }, // Invalid > 1
            { type: 'PHONE_NUMBER', confidence_threshold: -0.1, action: 'redact' } // Invalid < 0
          ]
        }
      };

      const result = service.validateYAML(yaml.dump(invalidConfidenceYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate action types', () => {
      const invalidActionYaml = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.9, action: 'invalid_action' }
          ]
        }
      };

      const result = service.validateYAML(yaml.dump(invalidActionYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('must be one of')
        ])
      );
    });

    it('should require replacement for replace actions', () => {
      const missingReplacementYaml = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.9, action: 'replace' } // Missing replacement
          ]
        }
      };

      const result = service.validateYAML(yaml.dump(missingReplacementYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('replacement')
        ])
      );
    });

    it('should validate file types', () => {
      const invalidFileTypeYaml = {
        ...validPolicyYaml,
        scope: {
          file_types: ['invalid_file_type'],
          max_file_size: '100MB'
        }
      };

      const result = service.validateYAML(yaml.dump(invalidFileTypeYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('must be one of')
        ])
      );
    });

    it('should validate file size format', () => {
      const invalidFileSizeYaml = {
        ...validPolicyYaml,
        scope: {
          file_types: ['txt'],
          max_file_size: 'invalid_size'
        }
      };

      const result = service.validateYAML(yaml.dump(invalidFileSizeYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('max_file_size')
        ])
      );
    });

    it('should validate version format', () => {
      const invalidVersionYaml = {
        ...validPolicyYaml,
        version: 'invalid.version.format.with.too.many.parts'
      };

      const result = service.validateYAML(yaml.dump(invalidVersionYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('version')
        ])
      );
    });

    it('should validate minimum entities requirement', () => {
      const noEntitiesYaml = {
        ...validPolicyYaml,
        detection: {
          entities: [] // Empty entities array
        }
      };

      const result = service.validateYAML(yaml.dump(noEntitiesYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('entities')
        ])
      );
    });

    it('should validate string length limits', () => {
      const longNameYaml = {
        ...validPolicyYaml,
        name: 'a'.repeat(300), // Exceeds max length
        description: 'b'.repeat(1100) // Exceeds max length
      };

      const result = service.validateYAML(yaml.dump(longNameYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate replacement text length', () => {
      const longReplacementYaml = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { 
              type: 'EMAIL_ADDRESS', 
              confidence_threshold: 0.9, 
              action: 'replace',
              replacement: 'a'.repeat(100) // Exceeds max length
            }
          ]
        }
      };

      const result = service.validateYAML(yaml.dump(longReplacementYaml));

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('replacement')
        ])
      );
    });
  });

  describe('toYAML', () => {
    it('should convert PolicyYAML object to YAML string', () => {
      const result = service.toYAML(validPolicyYaml);

      expect(typeof result).toBe('string');
      expect(result).toContain('name: Test Policy');
      expect(result).toContain('version: 1.0.0');
      expect(result).toContain('EMAIL_ADDRESS');

      // Verify it can be parsed back
      const parsed = yaml.load(result);
      expect(parsed).toMatchObject(validPolicyYaml);
    });

    it('should throw BadRequestException for invalid policy object', () => {
      const circularPolicy: any = { name: 'test' };
      circularPolicy.circular = circularPolicy; // Create circular reference

      expect(() => service.toYAML(circularPolicy)).toThrow(BadRequestException);
    });

    it('should use proper YAML formatting options', () => {
      const result = service.toYAML(validPolicyYaml);

      // Check indentation (should be 2 spaces)
      const lines = result.split('\n');
      const indentedLine = lines.find(line => line.startsWith('  '));
      expect(indentedLine).toBeDefined();
      expect(indentedLine.startsWith('  ')).toBe(true);
    });
  });

  describe('validateEntityTypes', () => {
    it('should return empty array for supported entity types', () => {
      const supportedEntities = [
        { type: 'EMAIL_ADDRESS' },
        { type: 'PHONE_NUMBER' },
        { type: 'CREDIT_CARD' },
        { type: 'SSN' },
        { type: 'URL' }
      ];

      const result = service.validateEntityTypes(supportedEntities);

      expect(result).toEqual([]);
    });

    it('should return unsupported entity types', () => {
      const mixedEntities = [
        { type: 'EMAIL_ADDRESS' }, // Supported
        { type: 'INVALID_TYPE_1' }, // Unsupported
        { type: 'PHONE_NUMBER' }, // Supported
        { type: 'INVALID_TYPE_2' } // Unsupported
      ];

      const result = service.validateEntityTypes(mixedEntities);

      expect(result).toEqual(['INVALID_TYPE_1', 'INVALID_TYPE_2']);
    });

    it('should handle all supported entity types', () => {
      const allSupportedEntities = [
        'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 
        'SSN', 'IBAN', 'IP_ADDRESS', 'DATE_TIME', 'LOCATION', 
        'ORGANIZATION', 'MEDICAL_LICENSE', 'US_DRIVER_LICENSE', 
        'US_PASSPORT', 'UK_NHS', 'URL'
      ].map(type => ({ type }));

      const result = service.validateEntityTypes(allSupportedEntities);

      expect(result).toEqual([]);
    });
  });

  describe('validateFileSize', () => {
    it('should validate correct file size formats', () => {
      const validSizes = ['100B', '50KB', '10MB', '1GB']; // Note: 100TB exceeds 10GB limit

      validSizes.forEach(size => {
        expect(service.validateFileSize(size)).toBe(true);
      });
    });

    it('should reject invalid file size formats', () => {
      const invalidSizes = [
        'invalid',
        '100',
        '100XB',
        '100 MB',
        'MB100',
        '100.5MB'
      ];

      invalidSizes.forEach(size => {
        expect(service.validateFileSize(size)).toBe(false);
      });
    });

    it('should reject zero or negative sizes', () => {
      const invalidSizes = ['0B', '-100MB'];

      invalidSizes.forEach(size => {
        expect(service.validateFileSize(size)).toBe(false);
      });
    });

    it('should reject sizes exceeding 10GB limit', () => {
      const oversizedFormats = ['11GB', '1TB', '100TB'];

      oversizedFormats.forEach(size => {
        expect(service.validateFileSize(size)).toBe(false);
      });
    });

    it('should accept sizes at the boundary (10GB)', () => {
      expect(service.validateFileSize('10GB')).toBe(true);
      expect(service.validateFileSize('10240MB')).toBe(true);
    });

    it('should handle different unit cases', () => {
      // The regex is case-sensitive and expects uppercase units
      expect(service.validateFileSize('100mb')).toBe(false);
      expect(service.validateFileSize('100MB')).toBe(true);
    });
  });

  describe('validateBusinessRules', () => {
    it('should return no warnings for valid policy', () => {
      const result = service.validateBusinessRules(validPolicyYaml);

      expect(result).toEqual([]);
    });

    it('should detect duplicate entity types', () => {
      const duplicateEntityPolicy: PolicyYAML = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.9, action: 'redact' },
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.8, action: 'mask' }, // Duplicate
            { type: 'PHONE_NUMBER', confidence_threshold: 0.8, action: 'redact' },
            { type: 'PHONE_NUMBER', confidence_threshold: 0.7, action: 'replace', replacement: '[PHONE]' } // Duplicate
          ]
        }
      };

      const result = service.validateBusinessRules(duplicateEntityPolicy);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Duplicate entity types found: EMAIL_ADDRESS, PHONE_NUMBER')
        ])
      );
    });

    it('should detect low confidence thresholds', () => {
      const lowConfidencePolicy: PolicyYAML = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.3, action: 'redact' }, // Low confidence
            { type: 'PHONE_NUMBER', confidence_threshold: 0.4, action: 'redact' }, // Low confidence
            { type: 'CREDIT_CARD', confidence_threshold: 0.8, action: 'redact' } // Good confidence
          ]
        }
      };

      const result = service.validateBusinessRules(lowConfidencePolicy);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Low confidence thresholds detected for: EMAIL_ADDRESS, PHONE_NUMBER')
        ])
      );
    });

    it('should detect missing replacement text for replace actions', () => {
      const missingReplacementPolicy: PolicyYAML = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.9, action: 'replace' }, // Missing replacement
            { type: 'PHONE_NUMBER', confidence_threshold: 0.8, action: 'replace' }, // Missing replacement
            { type: 'CREDIT_CARD', confidence_threshold: 0.95, action: 'replace', replacement: '[CARD]' } // Has replacement
          ]
        }
      };

      const result = service.validateBusinessRules(missingReplacementPolicy);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Replace actions missing replacement text: EMAIL_ADDRESS, PHONE_NUMBER')
        ])
      );
    });

    it('should validate file size format in business rules', () => {
      const invalidFileSizePolicy: PolicyYAML = {
        ...validPolicyYaml,
        scope: {
          ...validPolicyYaml.scope,
          max_file_size: 'invalid_size'
        }
      };

      const result = service.validateBusinessRules(invalidFileSizePolicy);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid file size format: invalid_size')
        ])
      );
    });

    it('should return multiple warnings when applicable', () => {
      const problematicPolicy: PolicyYAML = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.3, action: 'replace' }, // Low confidence + missing replacement
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.4, action: 'redact' }, // Duplicate + low confidence
          ]
        },
        scope: {
          ...validPolicyYaml.scope,
          max_file_size: 'invalid_size'
        }
      };

      const result = service.validateBusinessRules(problematicPolicy);

      expect(result.length).toBeGreaterThan(1);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Duplicate entity types'),
          expect.stringContaining('Low confidence thresholds'),
          expect.stringContaining('Replace actions missing replacement text'),
          expect.stringContaining('Invalid file size format')
        ])
      );
    });

    it('should handle edge case confidence thresholds', () => {
      const edgeCasePolicy: PolicyYAML = {
        ...validPolicyYaml,
        detection: {
          entities: [
            { type: 'EMAIL_ADDRESS', confidence_threshold: 0.5, action: 'redact' }, // Exactly at threshold
            { type: 'PHONE_NUMBER', confidence_threshold: 0.49, action: 'redact' }, // Just below threshold
          ]
        }
      };

      const result = service.validateBusinessRules(edgeCasePolicy);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Low confidence thresholds detected for: PHONE_NUMBER')
        ])
      );
      expect(result.some(warning => warning.includes('EMAIL_ADDRESS'))).toBe(false);
    });
  });
});