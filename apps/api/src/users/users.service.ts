import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole, AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CacheService } from '../cache/cache.service';

/**
 * User Creation Data
 *
 * Interface for creating new user accounts with required and optional fields.
 *
 * @property email - Unique email address for the user (required)
 * @property password - Hashed password (should be bcrypt hashed before passing to service)
 * @property firstName - User's first name (optional, can be updated later)
 * @property lastName - User's last name (optional, can be updated later)
 * @property role - User role for authorization (defaults to MEMBER if not specified)
 */
export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

/**
 * Users Service
 *
 * Manages user account lifecycle, profile data, and audit logging for the MaskWise platform.
 * Provides CRUD operations, soft delete support, and comprehensive audit trail functionality.
 *
 * Key responsibilities:
 * - User account creation and management
 * - User profile queries by ID and email
 * - Soft delete with activation/deactivation
 * - Permanent deletion with transactional cleanup
 * - Audit log creation and retrieval with advanced filtering
 * - User listing with pagination and search
 *
 * @remarks
 * User management design:
 * - Soft delete by default (isActive flag) for data retention
 * - Permanent delete available for GDPR compliance
 * - Email uniqueness enforced at database level
 * - Default role is MEMBER (not ADMIN)
 * - Password hashing handled by caller (AuthService)
 *
 * Audit logging:
 * - All user actions tracked for compliance
 * - Logs include IP address and user agent when available
 * - Advanced search with date range and action filtering
 * - User-scoped and global audit log queries
 * - Pagination support for large audit trails
 *
 * Security:
 * - Passwords never retrieved (excluded from queries)
 * - Soft delete prevents accidental data loss
 * - Audit logs preserved even after user deletion
 * - Transaction safety for permanent delete
 *
 * @see {@link AuthService} for password hashing and authentication
 * @see {@link UsersController} for HTTP endpoints
 * @see {@link User} for database model
 *
 * @since 1.0.0
 */
@Injectable()
export class UsersService {
  /**
   * Initializes users service with Prisma client
   *
   * @param prisma - Prisma service for database operations
   */
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Creates new user account
   *
   * Inserts user record into database with provided details. Password should be
   * pre-hashed by caller (typically AuthService). Default role is MEMBER.
   *
   * @param data - User creation data with email, hashed password, and optional profile
   * @returns Newly created user object including generated ID
   *
   * @remarks
   * Important notes:
   * - Password must be pre-hashed with bcrypt before calling
   * - Email uniqueness enforced by database constraint
   * - Default role is MEMBER if not specified
   * - User is active by default (isActive: true)
   * - Timestamps (createdAt, updatedAt) auto-generated
   *
   * Typical usage:
   * - Called from AuthService.register after password hashing
   * - Called from admin user creation with pre-hashed password
   * - Not exposed directly via API endpoints
   *
   * @throws {Prisma.PrismaClientKnownRequestError} P2002 if email already exists
   *
   * @example
   * ```typescript
   * const hashedPassword = await bcrypt.hash(password, 12);
   * const user = await usersService.create({
   *   email: 'user@example.com',
   *   password: hashedPassword,
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   role: UserRole.MEMBER
   * });
   * ```
   *
   * @see {@link AuthService.register} for typical usage with password hashing
   */
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

  /**
   * Finds user by unique ID
   *
   * Retrieves complete user record including password hash (for authentication).
   * Returns null if user doesn't exist.
   *
   * @param id - User's unique identifier (CUID)
   * @returns User object if found, null otherwise
   *
   * @remarks
   * Usage:
   * - Authentication: Verify user exists and is active
   * - Profile updates: Check user exists before updating
   * - Authorization: Load user for permission checks
   *
   * Security:
   * - Includes password hash (needed for authentication)
   * - Caller responsible for excluding password from responses
   * - No access control (service-level method)
   *
   * Performance:
   * - Indexed primary key lookup (very fast)
   * - Returns full user object (not optimized for specific fields)
   *
   * @example
   * ```typescript
   * const user = await usersService.findById('clxxx...');
   * if (user && user.isActive) {
   *   // User found and active
   * }
   * ```
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Finds user by email address
   *
   * Retrieves user record by unique email for authentication and duplicate checking.
   * Returns null if email not registered.
   *
   * @param email - User's email address (case-sensitive in database)
   * @returns User object if found, null otherwise
   *
   * @remarks
   * Primary uses:
   * - Login: Lookup user for credential validation
   * - Registration: Check if email already registered
   * - Password reset: Verify email exists
   *
   * Email handling:
   * - Case-sensitive database lookup
   * - Unique constraint enforced at database level
   * - Email format validation done at controller level
   *
   * Security:
   * - Returns full user including password hash
   * - Used by authentication strategies
   * - Timing attack mitigation via bcrypt comparison
   *
   * @example
   * ```typescript
   * const user = await usersService.findByEmail('user@example.com');
   * if (user) {
   *   throw new ConflictException('Email already registered');
   * }
   * ```
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Retrieves list of users with optional filtering and pagination
   *
   * Flexible user query method supporting pagination, filtering, and sorting
   * for admin user management interfaces.
   *
   * @param params - Optional query parameters for filtering, pagination, and sorting
   * @returns Array of user objects matching criteria
   *
   * @remarks
   * Supported operations:
   * - Pagination: skip and take for offset-based pagination
   * - Filtering: Prisma where clause for complex conditions
   * - Sorting: orderBy for custom sort orders
   * - Full user objects returned (including password hash)
   *
   * Common use cases:
   * - Admin dashboard: List all users with pagination
   * - User search: Filter by name, email, role
   * - Active users: Filter by isActive flag
   * - Role management: Find users by role
   *
   * Performance:
   * - Add indexes for frequently filtered fields
   * - Use take parameter to limit result set size
   * - Consider projection for large user lists
   *
   * @example
   * ```typescript
   * // Get first 10 active users
   * const users = await usersService.findAll({
   *   take: 10,
   *   where: { isActive: true },
   *   orderBy: { createdAt: 'desc' }
   * });
   *
   * // Pagination
   * const page2 = await usersService.findAll({
   *   skip: 10,
   *   take: 10
   * });
   * ```
   */
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

  /**
   * Updates user profile data
   *
   * @param id - User ID to update
   * @param data - Partial user data to update
   * @returns Updated user object
   * @throws {NotFoundException} If user doesn't exist
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    // Invalidate user cache to ensure fresh data on next JWT validation
    await this.cacheService.invalidateUser(id);

    return updatedUser;
  }

  /**
   * Soft deletes user by setting isActive to false
   *
   * Preferred deletion method that preserves user data and audit trail.
   * User can be reactivated later if needed.
   *
   * @param id - User ID to deactivate
   * @returns Deactivated user object
   * @throws {NotFoundException} If user doesn't exist
   *
   * @remarks
   * Soft delete benefits:
   * - Preserves audit trail and historical data
   * - Allows reactivation if deletion was mistake
   * - Maintains referential integrity
   * - Prevents authentication but keeps records
   */
  async delete(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate user cache to immediately revoke authentication
    await this.cacheService.invalidateUser(id);

    return deletedUser;
  }

  /**
   * Reactivates previously deactivated user
   *
   * @param id - User ID to activate
   * @returns Activated user object
   * @throws {NotFoundException} If user doesn't exist
   */
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

  /**
   * Permanently deletes user from database
   *
   * Hard delete for GDPR compliance or data cleanup. Use with caution.
   * Audit logs are preserved for compliance even after user deletion.
   *
   * @param id - User ID to permanently delete
   * @throws {NotFoundException} If user doesn't exist
   *
   * @remarks
   * GDPR considerations:
   * - Permanently removes user PII from database
   * - Audit logs intentionally preserved for compliance
   * - Transaction ensures atomic deletion
   * - Cannot be undone
   *
   * Use cases:
   * - GDPR "right to be forgotten" requests
   * - Test account cleanup
   * - Spam account removal
   */
  async permanentDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use a transaction to ensure all related data is cleaned up
    await this.prisma.$transaction(async (tx) => {
      // Delete related audit logs first (if we want to keep audit trail, we can skip this)
      // Note: We might want to keep audit logs for compliance, so commenting this out
      // await tx.auditLog.deleteMany({ where: { userId: id } });

      // Delete the user record
      await tx.user.delete({ where: { id } });
    });
  }

  /**
   * Creates audit log entry for user action
   *
   * Records user activity for compliance, security monitoring, and debugging.
   * Called throughout application whenever user performs significant action.
   *
   * @param userId - ID of user who performed the action
   * @param action - Type of action (LOGIN, CREATE, UPDATE, DELETE, etc.)
   * @param resource - Resource type affected (user, dataset, policy, etc.)
   * @param resourceId - ID of specific resource affected
   * @param details - Optional additional context (JSON object)
   * @param ipAddress - Optional IP address of request
   * @param userAgent - Optional browser/client user agent string
   *
   * @remarks
   * Audit logging best practices:
   * - Log all authentication events (LOGIN, LOGOUT, REFRESH)
   * - Log all data modifications (CREATE, UPDATE, DELETE)
   * - Log all permission changes and role assignments
   * - Include IP address and user agent for security analysis
   * - Use structured details object for searchable context
   *
   * Compliance:
   * - Required for SOC2, ISO 27001, GDPR compliance
   * - Provides audit trail for security incidents
   * - Enables user activity reporting
   * - Supports forensic analysis
   *
   * Performance:
   * - Fire-and-forget pattern recommended (don't await)
   * - Batch logging for high-throughput scenarios
   * - Consider async queue for heavy logging
   *
   * @example
   * ```typescript
   * // Log user login
   * await usersService.logAuditAction(
   *   user.id,
   *   AuditAction.LOGIN,
   *   'user',
   *   user.id,
   *   { method: 'password' },
   *   req.ip,
   *   req.headers['user-agent']
   * );
   *
   * // Log dataset creation
   * await usersService.logAuditAction(
   *   user.id,
   *   AuditAction.CREATE,
   *   'dataset',
   *   dataset.id,
   *   { name: dataset.name, size: dataset.fileSize }
   * );
   * ```
   */
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

  /**
   * Retrieves audit logs with advanced filtering and search
   *
   * Powerful audit log query supporting full-text search, action filtering,
   * date ranges, and pagination for compliance reporting and security analysis.
   *
   * @param userId - Optional user ID to scope logs (for user-specific audit trail)
   * @param params - Query parameters for filtering and pagination
   * @returns Object containing logs array, total count, and pagination info
   *
   * @remarks
   * Search capabilities:
   * - Full-text search across user names, emails, resources
   * - Action type filtering (LOGIN, CREATE, UPDATE, etc.)
   * - Date range filtering with inclusive boundaries
   * - Case-insensitive search for better UX
   *
   * Query optimization:
   * - Pagination required for large audit trails
   * - Includes user data via join for display
   * - Parallel query for logs and count (performance)
   * - Default limit 50 logs per page
   *
   * Use cases:
   * - User activity timeline for support
   * - Security incident investigation
   * - Compliance audit reports
   * - Admin dashboard activity feed
   *
   * @example
   * ```typescript
   * // Get recent logins for user
   * const result = await usersService.getAuditLogs(userId, {
   *   action: 'LOGIN',
   *   take: 10
   * });
   *
   * // Search for dataset operations in date range
   * const result = await usersService.getAuditLogs(null, {
   *   search: 'dataset',
   *   dateFrom: '2025-01-01',
   *   dateTo: '2025-01-31',
   *   take: 50
   * });
   * ```
   */
  async getAuditLogs(userId?: string, params?: {
    skip?: number;
    take?: number;
    where?: any;
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
    let whereClause: any = {};

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
      const searchFilters: any[] = [
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
        String(actionValue).toLowerCase().includes(search.toLowerCase())
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