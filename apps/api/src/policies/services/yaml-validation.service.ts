import { Injectable, BadRequestException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { PolicyYAML, PolicyYAMLSchema } from '../schemas/policy.schema';

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  parsed?: PolicyYAML;
}

@Injectable()
export class YamlValidationService {
  
  /**
   * Validates YAML content against the policy schema
   */
  validateYAML(yamlContent: string): ValidationResult {
    try {
      // Parse YAML
      const parsed = yaml.load(yamlContent) as any;
      
      if (!parsed || typeof parsed !== 'object') {
        return {
          isValid: false,
          errors: ['Invalid YAML format: Content must be a valid YAML object']
        };
      }

      // Validate against Joi schema
      const { error, value } = PolicyYAMLSchema.validate(parsed, {
        abortEarly: false,
        allowUnknown: false
      });

      if (error) {
        const errors = error.details.map(detail => {
          const path = detail.path.join('.');
          return `${path}: ${detail.message}`;
        });

        return {
          isValid: false,
          errors
        };
      }

      return {
        isValid: true,
        parsed: value as PolicyYAML
      };

    } catch (yamlError) {
      return {
        isValid: false,
        errors: [`YAML parsing error: ${yamlError.message}`]
      };
    }
  }

  /**
   * Converts PolicyYAML object to YAML string
   */
  toYAML(policy: PolicyYAML): string {
    try {
      return yaml.dump(policy, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });
    } catch (error) {
      throw new BadRequestException(`Failed to convert policy to YAML: ${error.message}`);
    }
  }

  /**
   * Validates entity types against supported Presidio entities
   */
  validateEntityTypes(entities: Array<{ type: string }>): string[] {
    const supportedEntities = [
      'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 
      'SSN', 'IBAN', 'IP_ADDRESS', 'DATE_TIME', 'LOCATION', 
      'ORGANIZATION', 'MEDICAL_LICENSE', 'US_DRIVER_LICENSE', 
      'US_PASSPORT', 'UK_NHS', 'URL'
    ];

    const unsupportedEntities: string[] = [];
    
    for (const entity of entities) {
      if (!supportedEntities.includes(entity.type)) {
        unsupportedEntities.push(entity.type);
      }
    }

    return unsupportedEntities;
  }

  /**
   * Validates file size format
   */
  validateFileSize(sizeStr: string): boolean {
    const pattern = /^(\d+)([KMGT]?)B$/;
    const match = sizeStr.match(pattern);
    
    if (!match) return false;

    const size = parseInt(match[1]);
    const unit = match[2];
    
    // Convert to bytes and check reasonable limits
    let bytes = size;
    switch (unit) {
      case 'K': bytes *= 1024; break;
      case 'M': bytes *= 1024 * 1024; break;
      case 'G': bytes *= 1024 * 1024 * 1024; break;
      case 'T': bytes *= 1024 * 1024 * 1024 * 1024; break;
    }

    // Check reasonable limits (max 10GB for now)
    return bytes > 0 && bytes <= 10 * 1024 * 1024 * 1024;
  }

  /**
   * Enhanced validation with business rules
   */
  validateBusinessRules(policy: PolicyYAML): string[] {
    const warnings: string[] = [];

    // Check for duplicate entity types
    const entityTypes = policy.detection.entities.map(e => e.type);
    const duplicates = entityTypes.filter((type, index) => entityTypes.indexOf(type) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate entity types found: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Check confidence thresholds
    const lowConfidenceEntities = policy.detection.entities
      .filter(e => e.confidence_threshold < 0.5)
      .map(e => e.type);
    if (lowConfidenceEntities.length > 0) {
      warnings.push(`Low confidence thresholds detected for: ${lowConfidenceEntities.join(', ')} (consider >= 0.5)`);
    }

    // Check replace actions have replacements
    const invalidReplaceActions = policy.detection.entities
      .filter(e => e.action === 'replace' && !e.replacement)
      .map(e => e.type);
    if (invalidReplaceActions.length > 0) {
      warnings.push(`Replace actions missing replacement text: ${invalidReplaceActions.join(', ')}`);
    }

    // Validate file size
    if (!this.validateFileSize(policy.scope.max_file_size)) {
      warnings.push(`Invalid file size format: ${policy.scope.max_file_size}`);
    }

    return warnings;
  }
}