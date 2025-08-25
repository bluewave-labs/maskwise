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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService, NotificationPayload, NotificationPreferences } from './notifications.service';
import { ModerateRateLimit } from '../throttling/rate-limit.decorators';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ModerateRateLimit()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Show only unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string', enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'] },
              category: { type: 'string', enum: ['SYSTEM', 'JOB', 'SECURITY', 'USER'] },
              isRead: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              actionUrl: { type: 'string' },
              actionLabel: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async getNotifications(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getNotifications(req.user.id, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category,
      type,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 204, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    await this.notificationsService.markAsRead(req.user.id, id);
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 204, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(@Request() req, @Param('id') id: string) {
    await this.notificationsService.deleteNotification(req.user.id, id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'boolean' },
        inApp: { type: 'boolean' },
        categories: {
          type: 'object',
          properties: {
            SYSTEM: { type: 'boolean' },
            JOB: { type: 'boolean' },
            SECURITY: { type: 'boolean' },
            USER: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getPreferences(@Request() req) {
    return this.notificationsService.getUserPreferences(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Request() req,
    @Body() preferences: Partial<NotificationPreferences>
  ) {
    await this.notificationsService.updateUserPreferences(req.user.id, preferences);
    return { message: 'Preferences updated successfully' };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTestNotification(@Request() req) {
    await this.notificationsService.sendNotification({
      userId: req.user.id,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      type: 'INFO',
      category: 'SYSTEM',
      metadata: { test: true, timestamp: new Date().toISOString() },
    });

    return { message: 'Test notification sent successfully' };
  }

  // Admin-only endpoints for system notifications
  @Post('system/maintenance')
  @ApiOperation({ summary: 'Send system maintenance notification to all users' })
  @ApiResponse({ status: 200, description: 'Maintenance notification sent' })
  async sendMaintenanceNotification(
    @Body() payload: { message: string; scheduledTime?: string }
  ) {
    const scheduledTime = payload.scheduledTime ? new Date(payload.scheduledTime) : undefined;
    await this.notificationsService.notifySystemMaintenance(payload.message, scheduledTime);
    return { message: 'Maintenance notification sent to all users' };
  }
}