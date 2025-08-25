import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../projects.service';
import { PrismaService } from '../../common/prisma.service';
import { InputSanitizerService } from '../../datasets/security/input-sanitizer.service';
import { CreateProjectDto } from '../dto/create-project.dto';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prismaService: PrismaService;
  let inputSanitizerService: InputSanitizerService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test project description',
    tags: ['test', 'demo'],
    isActive: true,
    userId: mockUser.id,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockProjectWithRelations = {
    ...mockProject,
    datasets: [
      {
        id: 'dataset-1',
        name: 'Test Dataset',
        status: 'COMPLETED',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        jobs: [
          {
            id: 'job-1',
            type: 'PII_ANALYSIS',
            status: 'COMPLETED',
            createdAt: new Date('2023-01-01T00:00:00.000Z'),
          }
        ]
      }
    ],
    _count: { datasets: 1 },
  };

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockInputSanitizerService = {
    sanitizeText: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: InputSanitizerService,
          useValue: mockInputSanitizerService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prismaService = module.get<PrismaService>(PrismaService);
    inputSanitizerService = module.get<InputSanitizerService>(InputSanitizerService);

    // Reset all mocks
    jest.clearAllMocks();

    // Default sanitizer behavior (returns input unchanged)
    mockInputSanitizerService.sanitizeText.mockImplementation((text) => text);
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

    it('should create a project with input sanitization and audit logging', async () => {
      const sanitizedName = 'Sanitized Project Name';
      const sanitizedDescription = 'Sanitized description';
      const sanitizedTags = ['sanitized-tag1', 'sanitized-tag2'];

      mockInputSanitizerService.sanitizeText
        .mockReturnValueOnce(sanitizedName) // name
        .mockReturnValueOnce(sanitizedDescription) // description
        .mockReturnValueOnce(sanitizedTags[0]) // tag 1
        .mockReturnValueOnce(sanitizedTags[1]); // tag 2

      const expectedProject = {
        ...mockProject,
        name: sanitizedName,
        description: sanitizedDescription,
        tags: sanitizedTags,
      };

      mockPrismaService.project.create.mockResolvedValue(expectedProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(createProjectDto, mockUser.id);

      expect(inputSanitizerService.sanitizeText).toHaveBeenCalledTimes(4);
      expect(inputSanitizerService.sanitizeText).toHaveBeenNthCalledWith(1, 'New Project', {
        maxLength: 100,
        allowHtml: false,
        allowSpecialCharacters: true,
      });
      expect(inputSanitizerService.sanitizeText).toHaveBeenNthCalledWith(2, 'New project description', {
        maxLength: 500,
        allowHtml: false,
        allowSpecialCharacters: true,
      });
      
      expect(prismaService.project.create).toHaveBeenCalledWith({
        data: {
          name: sanitizedName,
          description: sanitizedDescription,
          tags: sanitizedTags,
          userId: mockUser.id,
        },
      });

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: 'CREATE',
          resource: 'project',
          resourceId: expectedProject.id,
          details: {
            name: expectedProject.name,
            description: expectedProject.description,
            originalInput: {
              name: createProjectDto.name,
              description: createProjectDto.description,
            },
          },
        },
      });

      expect(result).toEqual(expectedProject);
    });

    it('should create project without description and tags', async () => {
      const minimalDto = { name: 'Minimal Project' };
      const sanitizedName = 'Sanitized Minimal Project';

      mockInputSanitizerService.sanitizeText.mockReturnValue(sanitizedName);

      const expectedProject = {
        ...mockProject,
        name: sanitizedName,
        description: null,
        tags: [],
      };

      mockPrismaService.project.create.mockResolvedValue(expectedProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(minimalDto, mockUser.id);

      expect(inputSanitizerService.sanitizeText).toHaveBeenCalledTimes(1);
      expect(prismaService.project.create).toHaveBeenCalledWith({
        data: {
          name: sanitizedName,
          description: undefined,
          tags: [],
          userId: mockUser.id,
        },
      });

      expect(result).toEqual(expectedProject);
    });

    it('should handle sanitization of special characters in tags', async () => {
      const dtoWithSpecialTags = {
        name: 'Test Project',
        tags: ['<script>alert("xss")</script>', 'normal-tag', 'tag with spaces'],
      };

      mockInputSanitizerService.sanitizeText
        .mockReturnValueOnce('Test Project') // name
        .mockReturnValueOnce('safe-tag') // sanitized malicious tag
        .mockReturnValueOnce('normal-tag') // normal tag
        .mockReturnValueOnce('tag-with-spaces'); // sanitized spaced tag

      const expectedProject = {
        ...mockProject,
        name: 'Test Project',
        description: null,
        tags: ['safe-tag', 'normal-tag', 'tag-with-spaces'],
      };

      mockPrismaService.project.create.mockResolvedValue(expectedProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(dtoWithSpecialTags, mockUser.id);

      expect(inputSanitizerService.sanitizeText).toHaveBeenCalledWith('<script>alert("xss")</script>', {
        maxLength: 50,
        allowHtml: false,
        allowSpecialCharacters: false,
      });
      
      expect(result).toEqual(expectedProject);
    });

    it('should handle database creation errors gracefully', async () => {
      const databaseError = new Error('Unique constraint violation');
      mockPrismaService.project.create.mockRejectedValue(databaseError);

      await expect(service.create(createProjectDto, mockUser.id))
        .rejects.toThrow('Unique constraint violation');

      expect(prismaService.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all active projects for user with datasets and counts', async () => {
      const projects = [mockProjectWithRelations];
      mockPrismaService.project.findMany.mockResolvedValue(projects);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.project.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isActive: true,
        },
        include: {
          datasets: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true,
            },
            take: 5,
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              datasets: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(projects);
    });

    it('should return empty array when user has no projects', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockUser.id);

      expect(result).toEqual([]);
    });

    it('should handle database connection failures', async () => {
      const connectionError = new Error('Database connection lost');
      mockPrismaService.project.findMany.mockRejectedValue(connectionError);

      await expect(service.findAll(mockUser.id))
        .rejects.toThrow('Database connection lost');
    });
  });

  describe('findOne', () => {
    it('should return a specific project with full dataset and job details', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProjectWithRelations);

      const result = await service.findOne(mockProject.id, mockUser.id);

      expect(prismaService.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProject.id,
          userId: mockUser.id,
          isActive: true,
        },
        include: {
          datasets: {
            include: {
              jobs: {
                take: 1,
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      expect(result).toEqual(mockProjectWithRelations);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id', mockUser.id))
        .rejects.toThrow(NotFoundException);
      
      expect(() => service.findOne('nonexistent-id', mockUser.id))
        .rejects.toThrow('Project not found');
    });

    it('should throw NotFoundException when project belongs to different user', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockProject.id, 'different-user-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when project is inactive', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockProject.id, mockUser.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateProjectDto = {
      name: 'Updated Project',
      description: 'Updated description',
      tags: ['updated', 'modified'],
    };

    it('should update project with sanitization and audit logging', async () => {
      const sanitizedName = 'Sanitized Updated Project';
      const sanitizedDescription = 'Sanitized updated description';
      const sanitizedTags = ['sanitized-updated', 'sanitized-modified'];

      mockInputSanitizerService.sanitizeText
        .mockReturnValueOnce(sanitizedName) // name
        .mockReturnValueOnce(sanitizedDescription) // description
        .mockReturnValueOnce(sanitizedTags[0]) // tag 1
        .mockReturnValueOnce(sanitizedTags[1]); // tag 2

      const updatedProject = {
        ...mockProject,
        name: sanitizedName,
        description: sanitizedDescription,
        tags: sanitizedTags,
        updatedAt: new Date(),
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue(updatedProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.update(mockProject.id, updateProjectDto, mockUser.id);

      expect(prismaService.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProject.id,
          userId: mockUser.id,
          isActive: true,
        },
      });

      expect(inputSanitizerService.sanitizeText).toHaveBeenCalledTimes(4);

      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: mockProject.id },
        data: {
          name: sanitizedName,
          description: sanitizedDescription,
          tags: sanitizedTags,
          updatedAt: expect.any(Date),
        },
      });

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: 'UPDATE',
          resource: 'project',
          resourceId: mockProject.id,
          details: {
            oldData: {
              name: mockProject.name,
              description: mockProject.description,
              tags: mockProject.tags,
            },
            newData: {
              name: updatedProject.name,
              description: updatedProject.description,
              tags: updatedProject.tags,
            },
          },
        },
      });

      expect(result).toEqual(updatedProject);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateProjectDto, mockUser.id))
        .rejects.toThrow(NotFoundException);

      expect(prismaService.project.update).not.toHaveBeenCalled();
      expect(prismaService.auditLog.create).not.toHaveBeenCalled();
    });

    it('should update project without description', async () => {
      const minimalUpdateDto = { name: 'Just Updated Name' };
      const sanitizedName = 'Sanitized Just Updated Name';

      mockInputSanitizerService.sanitizeText.mockReturnValue(sanitizedName);

      const updatedProject = {
        ...mockProject,
        name: sanitizedName,
        description: undefined,
        tags: [],
        updatedAt: new Date(),
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue(updatedProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.update(mockProject.id, minimalUpdateDto, mockUser.id);

      expect(result).toEqual(updatedProject);
    });

    it('should handle database update failures', async () => {
      const updateError = new Error('Database update failed');
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockRejectedValue(updateError);

      await expect(service.update(mockProject.id, updateProjectDto, mockUser.id))
        .rejects.toThrow('Database update failed');

      expect(prismaService.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete project with audit logging and dataset count', async () => {
      const projectWithCount = {
        ...mockProject,
        _count: { datasets: 3 },
      };

      const deactivatedProject = { ...mockProject, isActive: false, updatedAt: new Date() };

      mockPrismaService.project.findFirst.mockResolvedValue(projectWithCount);
      mockPrismaService.project.update.mockResolvedValue(deactivatedProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.remove(mockProject.id, mockUser.id);

      expect(prismaService.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProject.id,
          userId: mockUser.id,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              datasets: true,
            },
          },
        },
      });

      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: mockProject.id },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: 'DELETE',
          resource: 'project',
          resourceId: mockProject.id,
          details: {
            name: projectWithCount.name,
            datasetCount: 3,
          },
        },
      });

      expect(result).toEqual(deactivatedProject);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id', mockUser.id))
        .rejects.toThrow(NotFoundException);

      expect(prismaService.project.update).not.toHaveBeenCalled();
      expect(prismaService.auditLog.create).not.toHaveBeenCalled();
    });

    it('should handle database deletion failures', async () => {
      const deleteError = new Error('Database deletion failed');
      const projectWithCount = { ...mockProject, _count: { datasets: 0 } };

      mockPrismaService.project.findFirst.mockResolvedValue(projectWithCount);
      mockPrismaService.project.update.mockRejectedValue(deleteError);

      await expect(service.remove(mockProject.id, mockUser.id))
        .rejects.toThrow('Database deletion failed');

      expect(prismaService.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations gracefully', async () => {
      const createDto: CreateProjectDto = {
        name: 'Concurrent Project',
        description: 'Test concurrent operations',
        tags: ['concurrent'],
      };

      mockInputSanitizerService.sanitizeText.mockImplementation((text) => text);
      mockPrismaService.project.create.mockResolvedValue(mockProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const operations = Array.from({ length: 3 }, () => 
        service.create(createDto, mockUser.id)
      );

      const results = await Promise.allSettled(operations);
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3);
    });

    it('should handle audit log creation failures in create', async () => {
      const auditError = new Error('Audit log creation failed');
      mockPrismaService.project.create.mockResolvedValue(mockProject);
      mockPrismaService.auditLog.create.mockRejectedValue(auditError);

      const createDto: CreateProjectDto = {
        name: 'Test Project',
        description: 'Test description',
        tags: ['test'],
      };

      await expect(service.create(createDto, mockUser.id))
        .rejects.toThrow('Audit log creation failed');
    });

    it('should handle null and undefined values in input sanitization', async () => {
      const dtoWithNullValues = {
        name: 'Test Project',
        description: null,
        tags: null,
      };

      mockInputSanitizerService.sanitizeText.mockReturnValue('Sanitized Test Project');
      mockPrismaService.project.create.mockResolvedValue(mockProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(dtoWithNullValues, mockUser.id);

      expect(inputSanitizerService.sanitizeText).toHaveBeenCalledTimes(1); // Only name
      expect(prismaService.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Sanitized Test Project',
          description: undefined,
          tags: [],
          userId: mockUser.id,
        },
      });
    });

    it('should handle empty arrays and strings', async () => {
      const dtoWithEmptyValues = {
        name: '',
        description: '',
        tags: [],
      };

      mockInputSanitizerService.sanitizeText
        .mockReturnValueOnce('Default Project Name') // empty name gets sanitized
        .mockReturnValueOnce(''); // empty description

      mockPrismaService.project.create.mockResolvedValue(mockProject);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.create(dtoWithEmptyValues, mockUser.id);

      // Empty string description is falsy, so it's treated as undefined and not sanitized
      expect(inputSanitizerService.sanitizeText).toHaveBeenCalledTimes(1); // Only name
      expect(result).toEqual(mockProject);
    });
  });
});