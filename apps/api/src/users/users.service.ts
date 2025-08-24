import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole, AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || UserRole.MEMBER,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params || {};
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async logAuditAction(
    userId: string,
    action: AuditAction,
    resource: string,
    resourceId: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
      },
    });
  }

  async getAuditLogs(userId?: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.AuditLogWhereInput;
    search?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
  }) {
    const { 
      skip = 0, 
      take = 50, 
      where, 
      search,
      action,
      dateFrom,
      dateTo,
      userId: filterUserId
    } = params || {};
    
    // Build where clause with filters
    let whereClause: Prisma.AuditLogWhereInput = {};

    // Apply user filter
    if (userId) {
      whereClause.userId = userId;
    } else if (filterUserId) {
      whereClause.userId = filterUserId;
    }

    // Apply action filter - convert string to AuditAction enum
    if (action) {
      // Validate that the action is a valid enum value
      const validActions = Object.values(AuditAction);
      if (validActions.includes(action as AuditAction)) {
        whereClause.action = action as AuditAction;
      }
    }

    // Apply date range filters
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // Apply search filter (search in user names, emails, resource, or match action)
    if (search) {
      const searchFilters: Prisma.AuditLogWhereInput[] = [
        {
          user: {
            firstName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            lastName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
      ];

      // For action search, check if search matches any enum value (case-insensitive)
      const matchingActions = Object.values(AuditAction).filter(actionValue =>
        actionValue.toLowerCase().includes(search.toLowerCase())
      );
      
      if (matchingActions.length > 0) {
        searchFilters.push({ action: { in: matchingActions } });
      }

      whereClause.OR = searchFilters;
    }

    // Merge with additional where conditions
    if (where) {
      whereClause = { ...whereClause, ...where };
    }

    // Get both logs and total count
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take,
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: whereClause,
      })
    ]);

    return {
      logs,
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }
}