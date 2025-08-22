import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SystemConfigResponseDto } from './dto/system-config-response.dto';
import { SystemHealthResponseDto } from './dto/system-health-response.dto';
import { HealthMonitorService } from './services/health-monitor.service';

@ApiTags('System')
@Controller('system')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly healthMonitorService: HealthMonitorService,
  ) {}

  @Get('configuration')
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'System configuration retrieved successfully',
    type: SystemConfigResponseDto 
  })
  async getConfiguration(): Promise<SystemConfigResponseDto> {
    return this.systemService.getConfiguration();
  }

  @Put('configuration')
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'System configuration updated successfully',
    type: SystemConfigResponseDto 
  })
  async updateConfiguration(
    @Body() updateConfigDto: UpdateSystemConfigDto
  ): Promise<SystemConfigResponseDto> {
    return this.systemService.updateConfiguration(updateConfigDto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'System health status retrieved successfully',
    type: SystemHealthResponseDto 
  })
  async getHealth(): Promise<SystemHealthResponseDto> {
    return this.healthMonitorService.getSystemHealth();
  }
}