import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService, CreateUserData } from '../users.service';
import { PrismaService } from '../../common/prisma.service';
import { UserRole, AuditAction } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.MEMBER,
    isActive: true,
    emailVerified: false,
    emailVerificationToken: null,
    emailVerificationTokenExpiresAt: null,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockAdmin = {
    ...mockUser,
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockAuditLog = {
    id: 'audit-123',
    userId: mockUser.id,
    action: AuditAction.LOGIN,
    resource: 'user',
    resourceId: mockUser.id,
    details: { success: true },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    user: {
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
    },
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserData: CreateUserData = {
      email: 'newuser@example.com',
      password: 'hashedpassword123',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.MEMBER,
    };

    it('should create a user with all fields', async () => {
      const expectedUser = { ...mockUser, ...createUserData };
      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(createUserData);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserData.email,
          password: createUserData.password,
          firstName: createUserData.firstName,
          lastName: createUserData.lastName,
          role: UserRole.MEMBER,
        },
      });

      expect(result).toEqual(expectedUser);
    });

    it('should create a user with minimal fields (defaults to MEMBER role)', async () => {
      const minimalData = {
        email: 'minimal@example.com',
        password: 'hashedpassword',
      };

      const expectedUser = {
        ...mockUser,
        email: minimalData.email,
        password: minimalData.password,
        firstName: undefined,
        lastName: undefined,
        role: UserRole.MEMBER,
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(minimalData);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: minimalData.email,
          password: minimalData.password,
          firstName: undefined,
          lastName: undefined,
          role: UserRole.MEMBER,
        },
      });

      expect(result).toEqual(expectedUser);
    });

    it('should create a user with ADMIN role when specified', async () => {
      const adminData = {
        ...createUserData,
        role: UserRole.ADMIN,
      };

      const expectedUser = { ...mockAdmin, ...adminData };
      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(adminData);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: adminData.email,
          password: adminData.password,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          role: UserRole.ADMIN,
        },
      });

      expect(result).toEqual(expectedUser);
    });

    it('should handle database creation errors', async () => {
      const dbError = new Error('Email already exists');
      mockPrismaService.user.create.mockRejectedValue(dbError);

      await expect(service.create(createUserData))
        .rejects.toThrow('Email already exists');
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPrismaService.user.findUnique.mockRejectedValue(dbError);

      await expect(service.findById(mockUser.id))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle case sensitivity correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('TEST@EXAMPLE.COM');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'TEST@EXAMPLE.COM' },
      });
    });
  });

  describe('findAll', () => {
    const mockUsers = [mockUser, mockAdmin];

    it('should return all users without parameters', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        where: undefined,
        orderBy: undefined,
      });

      expect(result).toEqual(mockUsers);
    });

    it('should return users with pagination parameters', async () => {
      const paginatedUsers = [mockUser];
      mockPrismaService.user.findMany.mockResolvedValue(paginatedUsers);

      const params = {
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' as const },
      };

      const result = await service.findAll(params);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(paginatedUsers);
    });

    it('should return users with where conditions', async () => {
      const activeUsers = [mockUser];
      mockPrismaService.user.findMany.mockResolvedValue(activeUsers);

      const params = {
        where: { isActive: true, role: UserRole.MEMBER },
      };

      const result = await service.findAll(params);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        where: { isActive: true, role: UserRole.MEMBER },
        orderBy: undefined,
      });

      expect(result).toEqual(activeUsers);
    });

    it('should return empty array when no users found', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateData = {
      firstName: 'Updated John',
      lastName: 'Updated Doe',
      role: UserRole.ADMIN,
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateData);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updateData,
      });

      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateData))
        .rejects.toThrow(NotFoundException);

      expect(() => service.update('nonexistent-id', updateData))
        .rejects.toThrow('User not found');

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { firstName: 'Only First Name' };
      const updatedUser = { ...mockUser, firstName: 'Only First Name' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, partialUpdate);

      expect(result).toEqual(updatedUser);
    });

    it('should handle database update errors', async () => {
      const dbError = new Error('Database constraint violation');
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockRejectedValue(dbError);

      await expect(service.update(mockUser.id, updateData))
        .rejects.toThrow('Database constraint violation');
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete user by setting isActive to false', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(deactivatedUser);

      const result = await service.delete(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: false },
      });

      expect(result).toEqual(deactivatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id'))
        .rejects.toThrow(NotFoundException);

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('should activate user by setting isActive to true', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const activatedUser = { ...mockUser, isActive: true };

      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);
      mockPrismaService.user.update.mockResolvedValue(activatedUser);

      const result = await service.activate(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: true },
      });

      expect(result).toEqual(activatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.activate('nonexistent-id'))
        .rejects.toThrow(NotFoundException);

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('permanentDelete', () => {
    it('should permanently delete user using transaction', async () => {
      const mockTransaction = jest.fn();
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          user: { delete: jest.fn() },
          auditLog: { deleteMany: jest.fn() },
        };
        return callback(mockTx);
      });

      await service.permanentDelete(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.permanentDelete('nonexistent-id'))
        .rejects.toThrow(NotFoundException);

      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      const transactionError = new Error('Transaction failed');
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockRejectedValue(transactionError);

      await expect(service.permanentDelete(mockUser.id))
        .rejects.toThrow('Transaction failed');
    });
  });

  describe('logAuditAction', () => {
    it('should create audit log with all parameters', async () => {
      const auditData = {
        userId: mockUser.id,
        action: AuditAction.LOGIN,
        resource: 'user',
        resourceId: mockUser.id,
        details: { success: true, method: 'email' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test)',
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logAuditAction(
        auditData.userId,
        auditData.action,
        auditData.resource,
        auditData.resourceId,
        auditData.details,
        auditData.ipAddress,
        auditData.userAgent,
      );

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: auditData.userId,
          action: auditData.action,
          resource: auditData.resource,
          resourceId: auditData.resourceId,
          details: auditData.details,
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent,
        },
      });
    });

    it('should create audit log with minimal parameters', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logAuditAction(
        mockUser.id,
        AuditAction.CREATE,
        'project',
        'project-123',
      );

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: AuditAction.CREATE,
          resource: 'project',
          resourceId: 'project-123',
          details: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });

    it('should handle audit log creation errors', async () => {
      const auditError = new Error('Audit log creation failed');
      mockPrismaService.auditLog.create.mockRejectedValue(auditError);

      await expect(service.logAuditAction(
        mockUser.id,
        AuditAction.LOGIN,
        'user',
        mockUser.id,
      )).rejects.toThrow('Audit log creation failed');
    });
  });

  describe('getAuditLogs', () => {
    const mockAuditLogs = [mockAuditLog];
    const mockTotal = 1;

    beforeEach(() => {
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(mockTotal);
    });

    it('should return audit logs with default pagination', async () => {
      const result = await service.getAuditLogs();

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 50,
        where: {},
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
      });

      expect(result).toEqual({
        logs: mockAuditLogs,
        total: mockTotal,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return audit logs filtered by userId', async () => {
      const result = await service.getAuditLogs(mockUser.id);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 50,
        where: { userId: mockUser.id },
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
      });

      expect(result.logs).toEqual(mockAuditLogs);
    });

    it('should return audit logs with pagination parameters', async () => {
      const params = {
        skip: 20,
        take: 10,
      };

      const result = await service.getAuditLogs(undefined, params);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        where: {},
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
      });

      expect(result.page).toBe(3); // skip 20 / take 10 + 1
    });

    it('should return audit logs filtered by action', async () => {
      const params = { action: 'LOGIN' };

      const result = await service.getAuditLogs(undefined, params);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: AuditAction.LOGIN },
        })
      );
    });

    it('should return audit logs filtered by date range', async () => {
      const params = {
        dateFrom: '2023-01-01',
        dateTo: '2023-01-31',
      };

      const result = await service.getAuditLogs(undefined, params);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: new Date('2023-01-01'),
              lte: new Date('2023-01-31T23:59:59.999Z'),
            },
          },
        })
      );
    });

    it('should return audit logs with search filter', async () => {
      const params = { search: 'john' };

      const result = await service.getAuditLogs(undefined, params);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              { user: { firstName: { contains: 'john', mode: 'insensitive' } } },
              { user: { lastName: { contains: 'john', mode: 'insensitive' } } },
              { user: { email: { contains: 'john', mode: 'insensitive' } } },
              { resource: { contains: 'john', mode: 'insensitive' } },
              { resourceId: { contains: 'john', mode: 'insensitive' } },
            ]),
          },
        })
      );
    });

    it('should handle search for action names', async () => {
      const params = { search: 'log' };

      const result = await service.getAuditLogs(undefined, params);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              { action: { in: [AuditAction.LOGIN, AuditAction.LOGOUT] } },
            ]),
          },
        })
      );
    });

    it('should ignore invalid action filters', async () => {
      const params = { action: 'INVALID_ACTION' };

      const result = await service.getAuditLogs(undefined, params);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}, // Invalid action should not be applied
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrismaService.auditLog.findMany.mockRejectedValue(dbError);

      await expect(service.getAuditLogs())
        .rejects.toThrow('Database connection failed');
    });

    it('should calculate pagination correctly', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(55);

      const result = await service.getAuditLogs(undefined, { skip: 10, take: 20 });

      expect(result.page).toBe(1); // floor(10/20) + 1
      expect(result.totalPages).toBe(3); // ceil(55/20)
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations gracefully', async () => {
      const createData: CreateUserData = {
        email: 'concurrent@example.com',
        password: 'password123',
      };

      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const operations = Array.from({ length: 3 }, () => service.create(createData));
      const results = await Promise.allSettled(operations);

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3);
    });

    it('should handle null and undefined values correctly', async () => {
      const userWithNullValues = {
        ...mockUser,
        firstName: null,
        lastName: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithNullValues);

      const result = await service.findById(mockUser.id);
      expect(result).toEqual(userWithNullValues);
    });

    it('should handle database connection timeouts', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'TimeoutError';

      mockPrismaService.user.findMany.mockRejectedValue(timeoutError);

      await expect(service.findAll())
        .rejects.toThrow('Connection timeout');
    });

    it('should handle empty date strings in audit log filtering', async () => {
      const params = {
        dateFrom: '',
        dateTo: '',
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      const result = await service.getAuditLogs(undefined, params);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}, // Empty date strings should not create date filters
        })
      );
    });
  });
});