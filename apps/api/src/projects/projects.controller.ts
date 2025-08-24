import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly, MemberAccess } from '../auth/decorators/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @AdminOnly() // Only admins can create projects
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  @MemberAccess() // Both admins and members can view projects
  @ApiOperation({ summary: 'Get all projects for current user' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async findAll(@Request() req) {
    return this.projectsService.findAll(req.user.id);
  }

  @Get(':id')
  @MemberAccess() // Both admins and members can view project details
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @AdminOnly() // Only admins can update projects
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(@Param('id') id: string, @Body() updateProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.update(id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  @AdminOnly() // Only admins can delete projects
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.projectsService.remove(id, req.user.id);
  }
}