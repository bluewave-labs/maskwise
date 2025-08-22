import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { InputSanitizerService } from '../datasets/security/input-sanitizer.service';

/**
 * Projects Service
 * 
 * Manages project lifecycle and organization within the Maskwise platform.
 * Projects serve as containers for datasets and provide organizational structure
 * for PII detection workflows.
 * 
 * Key features:
 * - Project CRUD operations with user isolation
 * - Dataset relationship management
 * - Audit logging for compliance
 * - Statistics and analytics integration
 */
@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private inputSanitizer: InputSanitizerService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    // Sanitize all input data
    const sanitizedData = {
      name: this.inputSanitizer.sanitizeText(createProjectDto.name, {
        maxLength: 100,
        allowHtml: false,
        allowSpecialCharacters: true // Allow some special characters for project names
      }),
      description: createProjectDto.description ? this.inputSanitizer.sanitizeText(createProjectDto.description, {
        maxLength: 500,
        allowHtml: false,
        allowSpecialCharacters: true
      }) : undefined,
      tags: createProjectDto.tags ? createProjectDto.tags.map(tag => 
        this.inputSanitizer.sanitizeText(tag, {
          maxLength: 50,
          allowHtml: false,
          allowSpecialCharacters: false
        })
      ) : []
    };

    const project = await this.prisma.project.create({
      data: {
        ...sanitizedData,
        userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        resource: 'project',
        resourceId: project.id,
        details: {
          name: project.name,
          description: project.description,
          originalInput: {
            name: createProjectDto.name,
            description: createProjectDto.description
          }
        },
      },
    });

    return project;
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        userId,
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
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        userId,
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

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, updateProjectDto: CreateProjectDto, userId: string) {
    // Verify project exists and user has access
    const existingProject = await this.prisma.project.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    // Sanitize all input data
    const sanitizedData = {
      name: this.inputSanitizer.sanitizeText(updateProjectDto.name, {
        maxLength: 100,
        allowHtml: false,
        allowSpecialCharacters: true
      }),
      description: updateProjectDto.description ? this.inputSanitizer.sanitizeText(updateProjectDto.description, {
        maxLength: 500,
        allowHtml: false,
        allowSpecialCharacters: true
      }) : undefined,
      tags: updateProjectDto.tags ? updateProjectDto.tags.map(tag => 
        this.inputSanitizer.sanitizeText(tag, {
          maxLength: 50,
          allowHtml: false,
          allowSpecialCharacters: false
        })
      ) : []
    };

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        ...sanitizedData,
        updatedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'project',
        resourceId: id,
        details: {
          oldData: {
            name: existingProject.name,
            description: existingProject.description,
            tags: existingProject.tags
          },
          newData: {
            name: updatedProject.name,
            description: updatedProject.description,
            tags: updatedProject.tags
          }
        },
      },
    });

    return updatedProject;
  }

  async remove(id: string, userId: string) {
    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        userId,
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

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Soft delete the project (mark as inactive)
    const deletedProject = await this.prisma.project.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'project',
        resourceId: id,
        details: {
          name: project.name,
          datasetCount: project._count.datasets,
        },
      },
    });

    return deletedProject;
  }
}