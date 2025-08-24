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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { ApiKeysService, CreateApiKeyDto, UpdateApiKeyDto } from './api-keys.service';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ 
    status: 201, 
    description: 'API key generated successfully',
    schema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            prefix: { type: 'string' },
            isActive: { type: 'boolean' },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        fullKey: { type: 'string', description: 'Full API key - only returned once' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate name' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async generateApiKey(@Request() req, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.generateApiKey(req.user.id, createApiKeyDto);
  }

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'List all API keys for the current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of API keys',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          prefix: { type: 'string' },
          isActive: { type: 'boolean' },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async listApiKeys(@Request() req) {
    return this.apiKeysService.listApiKeys(req.user.id);
  }

  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Get a specific API key by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'API key details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        prefix: { type: 'string' },
        isActive: { type: 'boolean' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getApiKey(@Request() req, @Param('id') id: string) {
    return this.apiKeysService.getApiKey(req.user.id, id);
  }

  @Put(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Update an API key' })
  @ApiResponse({ 
    status: 200, 
    description: 'API key updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        prefix: { type: 'string' },
        isActive: { type: 'boolean' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate name' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateApiKey(
    @Request() req, 
    @Param('id') id: string, 
    @Body() updateApiKeyDto: UpdateApiKeyDto
  ) {
    return this.apiKeysService.updateApiKey(req.user.id, id, updateApiKeyDto);
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async deleteApiKey(@Request() req, @Param('id') id: string) {
    await this.apiKeysService.deleteApiKey(req.user.id, id);
  }
}