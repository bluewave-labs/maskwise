import * as yaml from 'js-yaml';
import { logger } from '../utils/logger.js';
import { db } from '../database/prisma.js';

/**
 * Policy YAML Structure Interface
 * Defines the expected structure of YAML policy files
 */
export interface PolicyYAML {
  name: string;
  version: string;
  description: string;
  detection: {
    entities: Array<{
      type: string;
      confidence_threshold: number;
      action: 'redact' | 'mask' | 'replace' | 'encrypt';
      replacement?: string;
    }>;
  };
  scope: {
    file_types: string[];
    max_file_size: string;
  };
  anonymization: {
    default_action: 'redact' | 'mask' | 'replace' | 'encrypt';
    preserve_format: boolean;
    audit_trail: boolean;
  };
}

/**
 * Parsed Policy Configuration Interface
 * Used by the PII analysis processor
 */
export interface PolicyConfig {
  entities: string[];
  confidence_threshold: number;
  entity_configurations: Record<string, {
    confidence_threshold: number;
    action: string;
    replacement?: string;
  }>;
  anonymization: {
    default_action: string;
    preserve_format: boolean;
    audit_trail: boolean;
  };
  scope: {
    file_types: string[];
    max_file_size: string;
  };
}

/**
 * Policy Service
 * 
 * Handles policy retrieval, YAML parsing, and configuration conversion
 * for the PII detection pipeline. Provides cached policy configurations
 * and entity-specific settings for Presidio analysis.
 */
export class PolicyService {
  private policyCache = new Map<string, PolicyConfig>();
  
  /**
   * Get Policy Configuration by ID
   * 
   * Retrieves policy from database, parses YAML content, and converts
   * to analysis configuration format. Results are cached for performance.
   * 
   * @param policyId - Policy ID from database
   * @returns Parsed policy configuration or default config
   */
  async getPolicyConfig(policyId: string): Promise<PolicyConfig> {
    try {
      // Check cache first
      if (this.policyCache.has(policyId)) {
        logger.debug('Policy config retrieved from cache', { policyId });
        return this.policyCache.get(policyId)!;
      }

      // Fetch policy from database
      const policy = await db.client.policy.findUnique({
        where: { id: policyId },
        include: {
          versions: {
            where: { isActive: true },
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!policy) {
        logger.warn('Policy not found, using default configuration', { policyId });
        return this.getDefaultPolicyConfig();
      }

      let policyConfig: PolicyConfig;

      // Try to parse as YAML first (new format)
      if (policy.versions.length > 0) {
        const activeVersion = policy.versions[0];
        try {
          const yamlConfig = yaml.load(activeVersion.config as string) as PolicyYAML;
          policyConfig = this.convertYamlToConfig(yamlConfig);
          logger.info('Policy YAML parsed successfully', { 
            policyId, 
            policyName: yamlConfig.name,
            entities: yamlConfig.detection.entities.length 
          });
        } catch (yamlError) {
          logger.warn('Failed to parse policy YAML, trying JSON fallback', { 
            policyId, 
            error: yamlError instanceof Error ? yamlError.message : 'Unknown error' 
          });
          policyConfig = this.convertLegacyConfig(policy.config);
        }
      } else {
        // Fallback to legacy JSON format
        policyConfig = this.convertLegacyConfig(policy.config);
      }

      // Cache the result
      this.policyCache.set(policyId, policyConfig);
      
      return policyConfig;

    } catch (error) {
      logger.error('Error retrieving policy configuration', {
        policyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.getDefaultPolicyConfig();
    }
  }

  /**
   * Convert YAML Policy to Analysis Configuration
   * 
   * Transforms YAML policy structure into the format expected
   * by the PII analysis processor and Presidio service.
   * 
   * @param yamlConfig - Parsed YAML policy configuration
   * @returns Analysis-ready policy configuration
   */
  private convertYamlToConfig(yamlConfig: PolicyYAML): PolicyConfig {
    const entityConfigurations: Record<string, any> = {};
    const entities: string[] = [];

    // Process each entity configuration
    yamlConfig.detection.entities.forEach(entity => {
      entities.push(entity.type);
      entityConfigurations[entity.type] = {
        confidence_threshold: entity.confidence_threshold,
        action: entity.action,
        replacement: entity.replacement
      };
    });

    // Find the minimum confidence threshold across all entities
    const confidence_threshold = Math.min(
      ...yamlConfig.detection.entities.map(e => e.confidence_threshold)
    );

    return {
      entities,
      confidence_threshold,
      entity_configurations: entityConfigurations,
      anonymization: yamlConfig.anonymization,
      scope: yamlConfig.scope
    };
  }

  /**
   * Convert Legacy JSON Policy Configuration
   * 
   * Handles backward compatibility with existing JSON-format policies
   * from policy templates before YAML implementation.
   * 
   * @param legacyConfig - JSON policy configuration
   * @returns Analysis-ready policy configuration
   */
  private convertLegacyConfig(legacyConfig: any): PolicyConfig {
    const config = typeof legacyConfig === 'string' 
      ? JSON.parse(legacyConfig) 
      : legacyConfig;

    const entities = config.entities || ['EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD'];
    const confidence_threshold = config.confidence_threshold || 0.5;
    
    // Create entity configurations with uniform settings for legacy policies
    const entity_configurations: Record<string, any> = {};
    entities.forEach((entity: string) => {
      entity_configurations[entity] = {
        confidence_threshold,
        action: config.anonymization?.default_anonymizer || 'redact'
      };
    });

    return {
      entities,
      confidence_threshold,
      entity_configurations,
      anonymization: {
        default_action: config.anonymization?.default_anonymizer || 'redact',
        preserve_format: config.anonymization?.preserve_format || true,
        audit_trail: config.anonymization?.audit_trail || true
      },
      scope: {
        file_types: ['txt', 'csv', 'pdf', 'docx'],
        max_file_size: '100MB'
      }
    };
  }

  /**
   * Get Default Policy Configuration
   * 
   * Returns a safe default configuration when policy lookup fails
   * or no policy is specified. Includes common PII types with
   * conservative confidence thresholds.
   * 
   * @returns Default policy configuration
   */
  private getDefaultPolicyConfig(): PolicyConfig {
    const entities = [
      'EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD', 'PHONE_NUMBER', 
      'PERSON', 'DATE_TIME', 'IP_ADDRESS', 'URL'
    ];
    
    const entity_configurations: Record<string, any> = {};
    entities.forEach(entity => {
      entity_configurations[entity] = {
        confidence_threshold: 0.8,
        action: 'redact'
      };
    });

    return {
      entities,
      confidence_threshold: 0.8,
      entity_configurations,
      anonymization: {
        default_action: 'redact',
        preserve_format: true,
        audit_trail: true
      },
      scope: {
        file_types: ['txt', 'csv', 'pdf', 'docx'],
        max_file_size: '100MB'
      }
    };
  }

  /**
   * Get Entity-Specific Configuration
   * 
   * Returns the confidence threshold and action for a specific entity type
   * based on the policy configuration. Used for filtering analysis results.
   * 
   * @param policyConfig - Policy configuration
   * @param entityType - Entity type (e.g., 'EMAIL_ADDRESS')
   * @returns Entity-specific settings or null if not configured
   */
  getEntityConfig(policyConfig: PolicyConfig, entityType: string) {
    return policyConfig.entity_configurations[entityType] || null;
  }

  /**
   * Should Process Entity Type
   * 
   * Determines if an entity type should be processed based on policy
   * configuration. Used to filter Presidio analysis results.
   * 
   * @param policyConfig - Policy configuration
   * @param entityType - Entity type to check
   * @param confidence - Confidence score of the detection
   * @returns True if entity should be processed
   */
  shouldProcessEntity(policyConfig: PolicyConfig, entityType: string, confidence: number): boolean {
    const entityConfig = this.getEntityConfig(policyConfig, entityType);
    
    if (!entityConfig) {
      // If specific entity not configured, check if it's in allowed entities list
      return policyConfig.entities.includes(entityType) && 
             confidence >= policyConfig.confidence_threshold;
    }
    
    return confidence >= entityConfig.confidence_threshold;
  }

  /**
   * Clear Policy Cache
   * 
   * Clears the policy configuration cache. Used when policies are updated
   * to ensure fresh configurations are loaded.
   */
  clearCache(): void {
    this.policyCache.clear();
    logger.info('Policy cache cleared');
  }

  /**
   * Get Cache Statistics
   * 
   * Returns information about the policy cache for monitoring and debugging.
   * 
   * @returns Cache statistics object
   */
  getCacheStats() {
    return {
      size: this.policyCache.size,
      policies: Array.from(this.policyCache.keys())
    };
  }
}

// Export singleton instance
export const policyService = new PolicyService();