import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

export interface CreateApiKeyDto {
  name: string;
}

export interface UpdateApiKeyDto {
  name?: string;
  isActive?: boolean;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface GenerateApiKeyResponse {
  apiKey: ApiKeyResponse;
  fullKey: string; // Only returned once during generation
}

@Injectable()
export class ApiKeysService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Generate a new API key for the user
   */
  async generateApiKey(userId: string, data: CreateApiKeyDto): Promise<GenerateApiKeyResponse> {
    // Validate input
    if (!data.name?.trim()) {
      throw new BadRequestException('API key name is required');
    }

    if (data.name.length > 100) {
      throw new BadRequestException('API key name must be less than 100 characters');
    }

    // Check if user already has a key with this name
    const existingKey = await this.prisma.apiKey.findFirst({
      where: {
        userId,
        name: data.name.trim(),
      },
    });

    if (existingKey) {
      throw new BadRequestException('An API key with this name already exists');
    }

    // Generate cryptographically secure key
    const secret = crypto.randomBytes(36).toString('hex'); // 72 chars
    const prefixRandom = crypto.randomBytes(4).toString('hex'); // 8 chars  
    const prefix = `mk_live_${prefixRandom}`;
    const fullKey = `${prefix}_${secret}`;
    
    // Hash the key for secure storage (never store plain text)
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    try {
      // Create the API key record
      const apiKey = await this.prisma.apiKey.create({
        data: {
          name: data.name.trim(),
          keyHash,
          prefix,
          userId,
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: 'CREATE',
        entity: 'ApiKey',
        entityId: apiKey.id,
        details: {
          keyName: apiKey.name,
          prefix: apiKey.prefix,
        },
      });

      return {
        apiKey,
        fullKey, // Return full key only once
      };
    } catch (error) {
      throw new BadRequestException('Failed to generate API key');
    }
  }

  /**
   * List all API keys for the user
   */
  async listApiKeys(userId: string): Promise<ApiKeyResponse[]> {
    return this.prisma.apiKey.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single API key by ID
   */
  async getApiKey(userId: string, keyId: string): Promise<ApiKeyResponse> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  /**
   * Update an API key
   */
  async updateApiKey(userId: string, keyId: string, data: UpdateApiKeyDto): Promise<ApiKeyResponse> {
    // Check if key exists and belongs to user
    const existingKey = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
    });

    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }

    // If updating name, check for duplicates
    if (data.name && data.name.trim() !== existingKey.name) {
      const duplicateKey = await this.prisma.apiKey.findFirst({
        where: {
          userId,
          name: data.name.trim(),
          id: { not: keyId },
        },
      });

      if (duplicateKey) {
        throw new BadRequestException('An API key with this name already exists');
      }
    }

    try {
      const updatedKey = await this.prisma.apiKey.update({
        where: {
          id: keyId,
        },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: 'UPDATE',
        entity: 'ApiKey',
        entityId: keyId,
        details: {
          changes: data,
          keyName: updatedKey.name,
        },
      });

      return updatedKey;
    } catch (error) {
      throw new BadRequestException('Failed to update API key');
    }
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    // Check if key exists and belongs to user
    const existingKey = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
    });

    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }

    try {
      await this.prisma.apiKey.delete({
        where: {
          id: keyId,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: 'DELETE',
        entity: 'ApiKey',
        entityId: keyId,
        details: {
          keyName: existingKey.name,
          prefix: existingKey.prefix,
        },
      });
    } catch (error) {
      throw new BadRequestException('Failed to delete API key');
    }
  }

  /**
   * Find API key by hash (used for authentication)
   */
  async findApiKeyByHash(keyHash: string): Promise<{
    id: string;
    name: string;
    isActive: boolean;
    expiresAt: Date | null;
    user: {
      id: string;
      email: string;
      role: string;
      firstName: string | null;
      lastName: string | null;
      isActive: boolean;
    };
  } | null> {
    return this.prisma.apiKey.findUnique({
      where: {
        keyHash,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Update last used timestamp for API key
   */
  async updateLastUsed(keyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: {
        id: keyId,
      },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Create hash from API key string (utility method)
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}