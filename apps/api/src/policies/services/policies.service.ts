import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { YamlValidationService, ValidationResult } from './yaml-validation.service';
import { PolicyYAML } from '../schemas/policy.schema';
import { Policy, PolicyVersion, PolicyTemplate } from '@prisma/client';

export interface CreatePolicyDto {
  name: string;
  description: string;
  yamlContent: string;
  tags?: string[];
  isActive?: boolean;
}

export interface UpdatePolicyDto {
  name?: string;
  description?: string;
  yamlContent?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface PolicyWithVersions extends Policy {
  versions: PolicyVersion[];
  _count: {
    versions: number;
  };
}

@Injectable()
export class PoliciesService {
  constructor(
    private prisma: PrismaService,
    private yamlValidationService: YamlValidationService,
  ) {}

  /**
   * Get all policies with pagination (policies are global, not user-specific)
   */
  async findAll(
    page: number = 1, 
    limit: number = 20,
    search?: string,
    isActive?: boolean
  ): Promise<{ policies: PolicyWithVersions[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      }),
      ...(isActive !== undefined && { isActive })
    };

    const [policies, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Latest version only for list view
          },
          _count: {
            select: { versions: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.policy.count({ where })
    ]);

    return {
      policies: policies as PolicyWithVersions[],
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Get a specific policy by ID with all versions
   */
  async findOne(policyId: string): Promise<PolicyWithVersions> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { versions: true }
        }
      }
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    return policy as PolicyWithVersions;
  }

  /**
   * Create a new policy
   */
  async create(userId: string, createPolicyDto: CreatePolicyDto): Promise<Policy> {
    // Validate YAML content
    const validation = this.yamlValidationService.validateYAML(createPolicyDto.yamlContent);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Invalid policy YAML',
        errors: validation.errors
      });
    }

    // Check for duplicate policy name (policies are global)
    const existingPolicy = await this.prisma.policy.findFirst({
      where: { 
        name: createPolicyDto.name 
      }
    });

    if (existingPolicy) {
      throw new ConflictException('Policy with this name already exists');
    }

    // Parse YAML to JSON for storage (convert to plain JSON object for Prisma)
    const configJson = JSON.parse(JSON.stringify(validation.parsed));

    // Create policy with initial version
    const policy = await this.prisma.$transaction(async (tx) => {
      // Create the policy
      const newPolicy = await tx.policy.create({
        data: {
          name: createPolicyDto.name,
          description: createPolicyDto.description,
          config: configJson,
          version: '1.0.0',
          isActive: createPolicyDto.isActive !== false, // Default to true
        }
      });

      // Create initial version
      await tx.policyVersion.create({
        data: {
          policyId: newPolicy.id,
          version: '1.0.0',
          config: configJson,
          changelog: 'Initial policy version',
          isActive: true
        }
      });

      return newPolicy;
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        resource: 'Policy',
        resourceId: policy.id,
        details: {
          policyName: policy.name,
          yamlValidation: validation.isValid
        }
      }
    });

    return policy;
  }

  /**
   * Update a policy (creates new version)
   */
  async update(userId: string, policyId: string, updatePolicyDto: UpdatePolicyDto): Promise<Policy> {
    const existingPolicy = await this.findOne(policyId);
    
    let validation: ValidationResult | undefined;
    let configJson: any;
    
    // If updating YAML content, validate it
    if (updatePolicyDto.yamlContent) {
      validation = this.yamlValidationService.validateYAML(updatePolicyDto.yamlContent);
      if (!validation.isValid) {
        throw new BadRequestException({
          message: 'Invalid policy YAML',
          errors: validation.errors
        });
      }
      configJson = JSON.parse(JSON.stringify(validation.parsed));
    }

    // Check for name conflicts if name is being changed
    if (updatePolicyDto.name && updatePolicyDto.name !== existingPolicy.name) {
      const nameConflict = await this.prisma.policy.findFirst({
        where: { 
          name: updatePolicyDto.name,
          id: { not: policyId }
        }
      });

      if (nameConflict) {
        throw new ConflictException('Policy with this name already exists');
      }
    }

    const updatedPolicy = await this.prisma.$transaction(async (tx) => {
      // Update the policy
      const policy = await tx.policy.update({
        where: { id: policyId },
        data: {
          ...(updatePolicyDto.name && { name: updatePolicyDto.name }),
          ...(updatePolicyDto.description && { description: updatePolicyDto.description }),
          ...(configJson && { config: configJson }),
          ...(updatePolicyDto.isActive !== undefined && { isActive: updatePolicyDto.isActive }),
          updatedAt: new Date()
        }
      });

      // Create new version if YAML content changed
      if (updatePolicyDto.yamlContent && configJson) {
        const latestVersion = existingPolicy.versions[0];
        const versionParts = latestVersion.version.split('.').map(Number);
        versionParts[1]++; // Increment minor version
        const newVersion = versionParts.join('.');

        // Deactivate previous version
        await tx.policyVersion.update({
          where: { id: latestVersion.id },
          data: { isActive: false }
        });

        // Create new active version
        await tx.policyVersion.create({
          data: {
            policyId: policy.id,
            version: newVersion,
            config: configJson,
            changelog: 'Policy updated',
            isActive: true
          }
        });
      }

      return policy;
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'Policy',
        resourceId: updatedPolicy.id,
        details: {
          policyName: updatedPolicy.name,
          yamlChanged: !!updatePolicyDto.yamlContent,
          yamlValidation: validation?.isValid
        }
      }
    });

    return updatedPolicy;
  }

  /**
   * Delete a policy (soft delete)
   */
  async delete(userId: string, policyId: string): Promise<void> {
    const policy = await this.findOne(policyId);

    await this.prisma.policy.update({
      where: { id: policyId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'Policy',
        resourceId: policyId,
        details: {
          policyName: policy.name
        }
      }
    });
  }

  /**
   * Get policy templates
   */
  async getTemplates(): Promise<PolicyTemplate[]> {
    return this.prisma.policyTemplate.findMany({
      orderBy: { category: 'asc' }
    });
  }

  /**
   * Create policy from template
   */
  async createFromTemplate(userId: string, templateId: string, name: string): Promise<Policy> {
    const template = await this.prisma.policyTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException('Policy template not found');
    }

    // Convert template config to proper YAML format
    const templateConfig = template.config as any;
    const policyYAML: PolicyYAML = {
      name: template.name,
      version: '1.0.0',
      description: template.description,
      detection: {
        entities: templateConfig.entities.map((entityType: string) => {
          const action = templateConfig.anonymization?.default_anonymizer || 'redact';
          const entity: any = {
            type: entityType,
            confidence_threshold: templateConfig.confidence_threshold || 0.8,
            action: action
          };
          
          // Add replacement if action is 'replace'
          if (action === 'replace') {
            entity.replacement = templateConfig.anonymization?.anonymizers?.replace?.new_value || '[REDACTED]';
          }
          
          return entity;
        })
      },
      scope: {
        file_types: ['txt', 'csv', 'pdf', 'docx', 'xlsx'],
        max_file_size: '100MB'
      },
      anonymization: {
        default_action: templateConfig.anonymization?.default_anonymizer || 'redact',
        preserve_format: true,
        audit_trail: true
      }
    };
    
    const yamlContent = this.yamlValidationService.toYAML(policyYAML);

    return this.create(userId, {
      name,
      description: `Policy created from ${template.name} template`,
      yamlContent,
      tags: [template.category.toLowerCase()]
    });
  }

  /**
   * Validate YAML content
   */
  async validateYaml(yamlContent: string): Promise<ValidationResult> {
    const validation = this.yamlValidationService.validateYAML(yamlContent);
    
    if (validation.isValid && validation.parsed) {
      const businessRuleWarnings = this.yamlValidationService.validateBusinessRules(validation.parsed);
      if (businessRuleWarnings.length > 0) {
        return {
          isValid: true,
          parsed: validation.parsed,
          errors: businessRuleWarnings // These are warnings, not errors
        };
      }
    }

    return validation;
  }
}