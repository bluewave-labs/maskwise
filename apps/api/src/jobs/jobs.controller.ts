import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberAccess } from '../auth/decorators/roles.decorator';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @MemberAccess() // Both admins and members can view jobs
  @ApiOperation({ summary: 'Get all jobs with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'datasetId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('datasetId') datasetId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.jobsService.findAll(req.user.id, {
      page: pageNum,
      limit: limitNum,
      status,
      type,
      datasetId,
    });
  }

  @Get('stats')
  @MemberAccess()
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiResponse({ status: 200, description: 'Job statistics retrieved successfully' })
  async getStats(@Request() req) {
    return this.jobsService.getStats(req.user.id);
  }

  @Get(':id')
  @MemberAccess()
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const job = await this.jobsService.findOne(id, req.user.id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  @Post(':id/retry')
  @MemberAccess()
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: 200, description: 'Job retried successfully' })
  @ApiResponse({ status: 400, description: 'Job cannot be retried' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retry(@Param('id') id: string, @Request() req) {
    return this.jobsService.retryJob(id, req.user.id);
  }

  @Post(':id/cancel')
  @MemberAccess()
  @ApiOperation({ summary: 'Cancel a running or queued job' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Job cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async cancel(@Param('id') id: string, @Request() req) {
    return this.jobsService.cancelJob(id, req.user.id);
  }
}