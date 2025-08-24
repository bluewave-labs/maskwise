import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../../auth/guards/api-key-auth.guard';
import { ProjectsService } from '../../projects/projects.service';
import { DatasetsService } from '../../datasets/datasets.service';
import { CreateProjectDto } from '../../projects/dto/create-project.dto';

@ApiTags('v1-projects')
@Controller('v1/projects')
@UseGuards(ApiKeyAuthGuard)
@ApiBearerAuth()
export class ProjectsV1Controller {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly datasetsService: DatasetsService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project (API v1)' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid project data' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async createProject(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List projects (API v1)' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async listProjects(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details (API v1)' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(@Request() req, @Param('id') id: string) {
    return this.projectsService.findOne(id, req.user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get project statistics (API v1)' })
  @ApiResponse({ status: 200, description: 'Project statistics' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectStats(@Request() req, @Param('id') id: string) {
    return this.datasetsService.getProjectStats(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project (API v1)' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: CreateProjectDto,
  ) {
    return this.projectsService.update(id, updateData, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project (API v1)' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(@Request() req, @Param('id') id: string) {
    await this.projectsService.remove(req.user.id, id);
  }
}