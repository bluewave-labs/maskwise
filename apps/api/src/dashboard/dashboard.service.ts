import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    // Get all statistics in parallel for better performance
    const [
      recentScans,
      totalDatasets,
      piiFindings,
      activeProjects,
    ] = await Promise.all([
      // Recent scans - jobs created in the last 7 days
      this.prisma.job.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
        },
      }),
      
      // Total datasets processed
      this.prisma.dataset.count(),
      
      // Total PII findings detected
      this.prisma.finding.count(),
      
      // Active projects
      this.prisma.project.count({
        where: {
          isActive: true,
        },
      }),
    ]);

    return {
      recentScans,
      totalDatasets,
      piiFindings,
      activeProjects,
    };
  }
}