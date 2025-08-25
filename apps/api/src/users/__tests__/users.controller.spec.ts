import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRole } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

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

  const mockRequest = {
    user: mockUser,
  };

  const mockAdminRequest = {
    user: mockAdmin,
  };

  const mockUsersService = {
    findById: jest.fn(),
    update: jest.fn(),
    logAuditAction: jest.fn(),
    getAuditLogs: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    activate: jest.fn(),
    delete: jest.fn(),
    permanentDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockRequest);

      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
        emailVerified: mockUser.emailVerified,
        emailVerificationToken: mockUser.emailVerificationToken,
        emailVerificationTokenExpiresAt: mockUser.emailVerificationTokenExpiresAt,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const result = await controller.getProfile(mockRequest);

      expect(result).toBeNull();
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      mockUsersService.findById.mockRejectedValue(serviceError);

      await expect(controller.getProfile(mockRequest))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateProfile', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated John',
      lastName: 'Updated Doe',
    };

    it('should update profile successfully and log audit action', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);
      mockUsersService.logAuditAction.mockResolvedValue(undefined);

      const result = await controller.updateProfile(mockRequest, updateDto);

      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(usersService.logAuditAction).toHaveBeenCalledWith(
        mockUser.id,
        'UPDATE',
        'user',
        mockUser.id,
        { fields: ['firstName', 'lastName'] },
      );
      
      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        emailVerified: updatedUser.emailVerified,
        emailVerificationToken: updatedUser.emailVerificationToken,
        emailVerificationTokenExpiresAt: updatedUser.emailVerificationTokenExpiresAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should handle update failures', async () => {
      const updateError = new NotFoundException('User not found');
      mockUsersService.update.mockRejectedValue(updateError);

      await expect(controller.updateProfile(mockRequest, updateDto))
        .rejects.toThrow(NotFoundException);

      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });

    it('should handle audit logging failures', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);
      mockUsersService.logAuditAction.mockRejectedValue(new Error('Audit log failed'));

      await expect(controller.updateProfile(mockRequest, updateDto))
        .rejects.toThrow('Audit log failed');
    });
  });

  describe('getAuditLogs', () => {
    const mockAuditLogsResponse = {
      logs: [
        {
          id: 'audit-1',
          userId: mockUser.id,
          action: 'LOGIN',
          resource: 'user',
          resourceId: mockUser.id,
          createdAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    it('should return user audit logs with default pagination', async () => {
      mockUsersService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.getAuditLogs(mockRequest);

      expect(usersService.getAuditLogs).toHaveBeenCalledWith(mockUser.id, {
        skip: 0,
        take: 50,
      });
      expect(result).toEqual(mockAuditLogsResponse);
    });

    it('should return user audit logs with custom pagination', async () => {
      mockUsersService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.getAuditLogs(mockRequest, '2', '10');

      expect(usersService.getAuditLogs).toHaveBeenCalledWith(mockUser.id, {
        skip: 10, // (2-1) * 10
        take: 10,
      });
    });

    it('should handle invalid page parameters', async () => {
      mockUsersService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.getAuditLogs(mockRequest, 'invalid', 'invalid');

      expect(usersService.getAuditLogs).toHaveBeenCalledWith(mockUser.id, {
        skip: 0, // defaults to page 1
        take: 50, // defaults to 50
      });
    });
  });

  describe('getAllAuditLogs', () => {
    const mockAuditLogsResponse = {
      logs: [],
      total: 0,
      page: 1,
      totalPages: 1,
    };

    it('should return all audit logs with default parameters', async () => {
      mockUsersService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.getAllAuditLogs();

      expect(usersService.getAuditLogs).toHaveBeenCalledWith(undefined, {
        skip: 0,
        take: 50,
        search: undefined,
        action: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        userId: undefined,
      });
    });

    it('should return all audit logs with all filter parameters', async () => {
      mockUsersService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.getAllAuditLogs(
        '2',
        '20',
        'john',
        'LOGIN',
        '2023-01-01',
        '2023-01-31',
        'user-123',
      );

      expect(usersService.getAuditLogs).toHaveBeenCalledWith(undefined, {
        skip: 20, // (2-1) * 20
        take: 20,
        search: 'john',
        action: 'LOGIN',
        dateFrom: '2023-01-01',
        dateTo: '2023-01-31',
        userId: 'user-123',
      });
    });
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'hashedpassword123',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.MEMBER,
    };

    it('should create user successfully and log audit action', async () => {
      const createdUser = { ...mockUser, ...createDto, id: 'new-user-123' };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockUsersService.logAuditAction.mockResolvedValue(undefined);

      const result = await controller.create(createDto, mockAdminRequest);

      expect(usersService.create).toHaveBeenCalledWith(createDto);
      expect(usersService.logAuditAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'CREATE',
        'user',
        createdUser.id,
        { email: createDto.email, role: UserRole.MEMBER },
      );

      expect(result).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        role: createdUser.role,
        isActive: createdUser.isActive,
        emailVerified: createdUser.emailVerified,
        emailVerificationToken: createdUser.emailVerificationToken,
        emailVerificationTokenExpiresAt: createdUser.emailVerificationTokenExpiresAt,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should create user with default role when not specified', async () => {
      const createDtoWithoutRole = {
        email: 'newuser@example.com',
        password: 'hashedpassword123',
        firstName: 'New',
        lastName: 'User',
      };
      
      const createdUser = { ...mockUser, ...createDtoWithoutRole, id: 'new-user-123' };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockUsersService.logAuditAction.mockResolvedValue(undefined);

      await controller.create(createDtoWithoutRole, mockAdminRequest);

      expect(usersService.logAuditAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'CREATE',
        'user',
        createdUser.id,
        { email: createDtoWithoutRole.email, role: 'USER' },
      );
    });

    it('should handle creation failures', async () => {
      const createError = new Error('Email already exists');
      mockUsersService.create.mockRejectedValue(createError);

      await expect(controller.create(createDto, mockAdminRequest))
        .rejects.toThrow('Email already exists');

      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockUsers = [mockUser, mockAdmin];

    it('should return all users without passwords with default pagination', async () => {
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
      result.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should return users with custom pagination', async () => {
      mockUsersService.findAll.mockResolvedValue([mockUser]);

      const result = await controller.findAll('3', '5');

      expect(usersService.findAll).toHaveBeenCalledWith({
        skip: 10, // (3-1) * 5
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle empty results', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user without password when found', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUser.id);

      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
        emailVerified: mockUser.emailVerified,
        emailVerificationToken: mockUser.emailVerificationToken,
        emailVerificationTokenExpiresAt: mockUser.emailVerificationTokenExpiresAt,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const result = await controller.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'User',
      role: UserRole.ADMIN,
    };

    it('should update user successfully and log audit action', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);
      mockUsersService.logAuditAction.mockResolvedValue(undefined);

      const result = await controller.update(mockUser.id, updateDto, mockAdminRequest);

      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(usersService.logAuditAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'UPDATE',
        'user',
        mockUser.id,
        { fields: ['firstName', 'lastName', 'role'] },
      );

      expect(result).not.toHaveProperty('password');
    });

    it('should handle update failures', async () => {
      const updateError = new NotFoundException('User not found');
      mockUsersService.update.mockRejectedValue(updateError);

      await expect(controller.update('nonexistent-id', updateDto, mockAdminRequest))
        .rejects.toThrow(NotFoundException);

      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('should activate user successfully and log audit action', async () => {
      const activatedUser = { ...mockUser, isActive: true };
      mockUsersService.activate.mockResolvedValue(activatedUser);
      mockUsersService.logAuditAction.mockResolvedValue(undefined);

      const result = await controller.activate(mockUser.id, mockAdminRequest);

      expect(usersService.activate).toHaveBeenCalledWith(mockUser.id);
      expect(usersService.logAuditAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'UPDATE',
        'user',
        mockUser.id,
        { action: 'activate' },
      );

      expect(result).not.toHaveProperty('password');
    });

    it('should handle activation failures', async () => {
      const activationError = new NotFoundException('User not found');
      mockUsersService.activate.mockRejectedValue(activationError);

      await expect(controller.activate('nonexistent-id', mockAdminRequest))
        .rejects.toThrow(NotFoundException);

      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });
  });

  describe('remove (soft delete)', () => {
    it('should deactivate user successfully and log audit action', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockUsersService.delete.mockResolvedValue(deactivatedUser);
      mockUsersService.logAuditAction.mockResolvedValue(undefined);

      const result = await controller.remove(mockUser.id, mockAdminRequest);

      expect(usersService.delete).toHaveBeenCalledWith(mockUser.id);
      expect(usersService.logAuditAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'DELETE',
        'user',
        mockUser.id,
      );

      expect(result).not.toHaveProperty('password');
    });

    it('should handle deactivation failures', async () => {
      const deleteError = new NotFoundException('User not found');
      mockUsersService.delete.mockRejectedValue(deleteError);

      await expect(controller.remove('nonexistent-id', mockAdminRequest))
        .rejects.toThrow(NotFoundException);

      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });
  });

  describe('permanentDelete', () => {
    const targetUser = {
      ...mockUser,
      id: 'target-user-123',
      email: 'target@example.com',
      firstName: 'Target',
      lastName: 'User',
    };

    it('should permanently delete user successfully and log audit action', async () => {
      mockUsersService.findById.mockResolvedValue(targetUser);
      mockUsersService.permanentDelete.mockResolvedValue(undefined);
      mockUsersService.logAuditAction.mockResolvedValue(undefined);

      const result = await controller.permanentDelete(targetUser.id, mockAdminRequest);

      expect(usersService.findById).toHaveBeenCalledWith(targetUser.id);
      expect(usersService.permanentDelete).toHaveBeenCalledWith(targetUser.id);
      expect(usersService.logAuditAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'DELETE',
        'user',
        targetUser.id,
        { 
          action: 'permanent_delete', 
          deletedUser: { 
            email: targetUser.email, 
            name: `${targetUser.firstName} ${targetUser.lastName}` 
          } 
        },
      );

      expect(result).toEqual({
        message: 'User permanently deleted',
        deletedUser: {
          id: targetUser.id,
          email: targetUser.email,
          name: `${targetUser.firstName} ${targetUser.lastName}`,
        },
      });
    });

    it('should prevent users from deleting themselves', async () => {
      await expect(controller.permanentDelete(mockAdmin.id, mockAdminRequest))
        .rejects.toThrow('Cannot delete your own account');

      expect(usersService.findById).not.toHaveBeenCalled();
      expect(usersService.permanentDelete).not.toHaveBeenCalled();
      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(controller.permanentDelete(targetUser.id, mockAdminRequest))
        .rejects.toThrow('User not found');

      expect(usersService.permanentDelete).not.toHaveBeenCalled();
      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });

    it('should handle permanent deletion failures', async () => {
      mockUsersService.findById.mockResolvedValue(targetUser);
      mockUsersService.permanentDelete.mockRejectedValue(new Error('Deletion failed'));

      await expect(controller.permanentDelete(targetUser.id, mockAdminRequest))
        .rejects.toThrow('Deletion failed');

      expect(usersService.logAuditAction).not.toHaveBeenCalled();
    });

    it('should handle audit logging failures after successful deletion', async () => {
      mockUsersService.findById.mockResolvedValue(targetUser);
      mockUsersService.permanentDelete.mockResolvedValue(undefined);
      mockUsersService.logAuditAction.mockRejectedValue(new Error('Audit log failed'));

      await expect(controller.permanentDelete(targetUser.id, mockAdminRequest))
        .rejects.toThrow('Audit log failed');

      expect(usersService.permanentDelete).toHaveBeenCalledWith(targetUser.id);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations gracefully', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const operations = Array.from({ length: 3 }, () => 
        controller.getProfile(mockRequest)
      );

      const results = await Promise.allSettled(operations);
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3);
    });

    it('should handle null values in user data', async () => {
      const userWithNulls = {
        ...mockUser,
        firstName: null,
        lastName: null,
      };

      mockUsersService.findById.mockResolvedValue(userWithNulls);

      const result = await controller.getProfile(mockRequest);

      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
    });

    it('should handle malformed pagination parameters', async () => {
      mockUsersService.getAuditLogs.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        totalPages: 1,
      });

      await controller.getAuditLogs(mockRequest, 'abc', 'xyz');

      expect(usersService.getAuditLogs).toHaveBeenCalledWith(mockUser.id, {
        skip: 0, // defaults to 1
        take: 50, // defaults to 50
      });
    });

    it('should handle zero and negative pagination values', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      await controller.findAll('0', '-5');

      expect(usersService.findAll).toHaveBeenCalledWith({
        skip: -0, // (0-1) * -5
        take: -5, // negative values are passed through
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});