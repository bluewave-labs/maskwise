import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectsController } from '../projects.controller';
import { ProjectsService } from '../projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test project description',
    tags: ['test', 'demo'],
    isActive: true,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'New Project',
      description: 'New project description',
      tags: ['new', 'test'],
    };

    it('should create a project successfully', async () => {
      mockProjectsService.create.mockResolvedValue(mockProject);

      const result = await controller.create(createProjectDto, { user: mockUser } as any);

      expect(projectsService.create).toHaveBeenCalledWith(createProjectDto, mockUser.id);
      expect(result).toEqual(mockProject);
    });

    it('should handle service errors gracefully', async () => {
      mockProjectsService.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.create(createProjectDto, { user: mockUser } as any))
        .rejects.toThrow('Database error');

      expect(projectsService.create).toHaveBeenCalledWith(createProjectDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return all projects for user', async () => {
      const mockProjects = [mockProject];
      mockProjectsService.findAll.mockResolvedValue(mockProjects);

      const result = await controller.findAll({ user: mockUser } as any);

      expect(projectsService.findAll).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockProjects);
    });

    it('should handle empty results', async () => {
      mockProjectsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll({ user: mockUser } as any);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a specific project', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);

      const result = await controller.findOne(mockProject.id, { user: mockUser } as any);

      expect(projectsService.findOne).toHaveBeenCalledWith(mockProject.id, mockUser.id);
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectsService.findOne.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.findOne('nonexistent-id', { user: mockUser } as any))
        .rejects.toThrow(NotFoundException);

      expect(projectsService.findOne).toHaveBeenCalledWith('nonexistent-id', mockUser.id);
    });
  });

  describe('update', () => {
    const updateProjectDto: CreateProjectDto = {
      name: 'Updated Project',
      description: 'Updated description',
      tags: ['updated', 'modified'],
    };

    it('should update a project successfully', async () => {
      const updatedProject = { ...mockProject, ...updateProjectDto };
      mockProjectsService.update.mockResolvedValue(updatedProject);

      const result = await controller.update(
        mockProject.id,
        updateProjectDto,
        { user: mockUser } as any
      );

      expect(projectsService.update).toHaveBeenCalledWith(
        mockProject.id,
        updateProjectDto,
        mockUser.id
      );
      expect(result).toEqual(updatedProject);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockProjectsService.update.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.update('nonexistent-id', updateProjectDto, { user: mockUser } as any))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a project successfully', async () => {
      const deletedProject = { ...mockProject, isActive: false };
      mockProjectsService.remove.mockResolvedValue(deletedProject);

      const result = await controller.remove(mockProject.id, { user: mockUser } as any);

      expect(projectsService.remove).toHaveBeenCalledWith(mockProject.id, mockUser.id);
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when deleting non-existent project', async () => {
      mockProjectsService.remove.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.remove('nonexistent-id', { user: mockUser } as any))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('authentication and authorization', () => {
    it('should handle user context extraction', async () => {
      const requestWithUser = {
        user: mockUser,
      };

      mockProjectsService.findAll.mockResolvedValue([]);

      await controller.findAll(requestWithUser as any);

      expect(projectsService.findAll).toHaveBeenCalledWith(mockUser.id);
    });

    it('should verify service dependencies', () => {
      expect(controller).toBeDefined();
      expect(projectsService).toBeDefined();
    });
  });
});