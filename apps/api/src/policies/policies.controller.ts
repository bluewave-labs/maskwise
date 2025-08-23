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
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesService, CreatePolicyDto, UpdatePolicyDto } from './services/policies.service';
import { ValidationResult } from './services/yaml-validation.service';

@ApiTags('policies')
@Controller('policies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all policies (global policies, not user-specific)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Policies retrieved successfully' })
  async findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    const isActiveBool = isActive !== undefined ? isActive === 'true' : undefined;

    return this.policiesService.findAll(pageNum, limitNum, search, isActiveBool);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all policy templates' })
  @ApiResponse({ status: 200, description: 'Policy templates retrieved successfully' })
  async getTemplates() {
    return this.policiesService.getTemplates();
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate YAML policy content' })
  @ApiResponse({ status: 200, description: 'YAML validation result' })
  @HttpCode(HttpStatus.OK)
  async validateYaml(@Body('yamlContent') yamlContent: string): Promise<ValidationResult> {
    return this.policiesService.validateYaml(yamlContent);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific policy by ID' })
  @ApiResponse({ status: 200, description: 'Policy retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new policy' })
  @ApiResponse({ status: 201, description: 'Policy created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid policy data or YAML' })
  @ApiResponse({ status: 409, description: 'Policy name already exists' })
  async create(@Request() req: any, @Body() createPolicyDto: CreatePolicyDto) {
    return this.policiesService.create(req.user.id, createPolicyDto);
  }

  @Post('from-template/:templateId')
  @ApiOperation({ summary: 'Create a policy from a template' })
  @ApiResponse({ status: 201, description: 'Policy created from template successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createFromTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() body: { name: string }
  ) {
    return this.policiesService.createFromTemplate(req.user.id, templateId, body.name);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a policy' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid policy data or YAML' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 409, description: 'Policy name already exists' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto
  ) {
    return this.policiesService.update(req.user.id, id, updatePolicyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a policy (soft delete)' })
  @ApiResponse({ status: 204, description: 'Policy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req: any, @Param('id') id: string) {
    await this.policiesService.delete(req.user.id, id);
  }
}