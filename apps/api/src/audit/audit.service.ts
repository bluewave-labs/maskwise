import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogData {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.entity,
        resourceId: data.entityId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}