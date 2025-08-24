import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';

interface JobFilters {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  datasetId?: string;
}

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, filters: JobFilters) {
    const { page, limit, status, type, datasetId } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      dataset: {
        project: {
          userId: userId,
        },
      },
    };

    if (status) {
      where.status = status as any;
    }

    if (type) {
      where.type = type as any;
    }

    if (datasetId) {
      where.datasetId = datasetId;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          dataset: {
            select: {
              id: true,
              name: true,
              filename: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          policy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    // Convert BigInt to string for JSON serialization
    const serializedJobs = jobs.map(job => ({
      ...job,
      metadata: job.metadata || {},
    }));

    return {
      data: serializedJobs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getStats(userId: string) {
    const where: Prisma.JobWhereInput = {
      dataset: {
        project: {
          userId: userId,
        },
      },
    };

    const [total, queued, running, completed, failed, cancelled] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.count({ where: { ...where, status: 'QUEUED' } }),
      this.prisma.job.count({ where: { ...where, status: 'RUNNING' } }),
      this.prisma.job.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.job.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.job.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    return {
      total,
      queued,
      running,
      completed,
      failed,
      cancelled,
    };
  }

  async findOne(id: string, userId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        dataset: {
          project: {
            userId: userId,
          },
        },
      },
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
            filename: true,
            fileType: true,
            fileSize: true,
            status: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        policy: {
          select: {
            id: true,
            name: true,
            version: true,
            config: true,
          },
        },
      },
    });

    if (!job) {
      return null;
    }

    // Convert BigInt to string for JSON serialization
    return {
      ...job,
      dataset: job.dataset ? {
        ...job.dataset,
        fileSize: job.dataset.fileSize.toString(),
      } : null,
      metadata: job.metadata || {},
    };
  }

  async retryJob(id: string, userId: string) {
    // First check if job exists and user has access
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        dataset: {
          project: {
            userId: userId,
          },
        },
      },
      include: {
        dataset: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found or access denied');
    }

    // Check if job can be retried (only failed or cancelled jobs)
    if (job.status !== 'FAILED' && job.status !== 'CANCELLED') {
      throw new BadRequestException(`Job cannot be retried. Current status: ${job.status}`);
    }

    // Create a new job with same parameters
    const newJob = await this.prisma.job.create({
      data: {
        type: job.type,
        status: 'QUEUED',
        priority: job.priority,
        datasetId: job.datasetId,
        createdById: userId,
        policyId: job.policyId,
        metadata: {
          ...(job.metadata as any || {}),
          isRetry: true,
          originalJobId: job.id,
          retryAttempt: ((job.metadata as any)?.retryAttempt || 0) + 1,
        },
      },
    });

    // Update dataset status if needed
    if (job.dataset && job.dataset.status === 'FAILED') {
      await this.prisma.dataset.update({
        where: { id: job.datasetId },
        data: { status: 'PENDING' },
      });
    }

    // Add audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        resource: 'job',
        resourceId: id,
        userId: userId,
        details: {
          action: 'RETRY_JOB',
          originalJobId: id,
          newJobId: newJob.id,
          jobType: job.type,
          datasetId: job.datasetId,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'API',
      },
    });

    return {
      success: true,
      message: 'Job has been queued for retry',
      originalJobId: id,
      newJobId: newJob.id,
    };
  }

  async cancelJob(id: string, userId: string) {
    // First check if job exists and user has access
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        dataset: {
          project: {
            userId: userId,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found or access denied');
    }

    // Check if job can be cancelled (only queued or running jobs)
    if (job.status !== 'QUEUED' && job.status !== 'RUNNING') {
      throw new BadRequestException(`Job cannot be cancelled. Current status: ${job.status}`);
    }

    // Update job status
    await this.prisma.job.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        endedAt: new Date(),
        error: 'Job cancelled by user',
      },
    });

    // Update dataset status if this was the only active job
    const activeJobs = await this.prisma.job.count({
      where: {
        datasetId: job.datasetId,
        status: {
          in: ['QUEUED', 'RUNNING'],
        },
        id: {
          not: id,
        },
      },
    });

    if (activeJobs === 0) {
      await this.prisma.dataset.update({
        where: { id: job.datasetId },
        data: { status: 'CANCELLED' },
      });
    }

    // Add audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        resource: 'job',
        resourceId: id,
        userId: userId,
        details: {
          action: 'CANCEL_JOB',
          jobId: id,
          jobType: job.type,
          datasetId: job.datasetId,
          previousStatus: job.status,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'API',
      },
    });

    return {
      success: true,
      message: 'Job has been cancelled',
      jobId: id,
    };
  }
}