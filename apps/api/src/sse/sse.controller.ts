import { Controller, Get, Post, Body, Req, Res, UseGuards, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SSEService } from './sse.service';
import * as crypto from 'crypto';

@ApiTags('sse')
@Controller('sse')
export class SSEController {
  constructor(private readonly sseService: SSEService) {}

  @Get('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Establish Server-Sent Events connection',
    description: 'Creates a persistent SSE connection for real-time updates including job status, dataset updates, and notifications'
  })
  @ApiQuery({ 
    name: 'clientId', 
    required: false, 
    description: 'Optional client ID for connection tracking' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'SSE stream established',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'data: {"type":"connected","message":"SSE connection established"}\n\n'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async streamEvents(
    @Req() req: Request, 
    @Res() res: Response,
    @Query('clientId') clientId?: string
  ): Promise<void> {
    const user = req.user as any;
    const finalClientId = clientId || crypto.randomUUID();

    this.sseService.addClient(finalClientId, user.id, res);

    // Send initial connection confirmation
    setTimeout(() => {
      this.sseService.sendNotification(
        user.id,
        'Connected',
        'Real-time updates are now active',
        'success'
      );
    }, 1000);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SSE connection status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Connection status information',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total connected clients' },
        byUser: { 
          type: 'object', 
          description: 'Connections grouped by user ID',
          additionalProperties: { type: 'number' }
        }
      }
    }
  })
  getStatus() {
    return this.sseService.getConnectedClients();
  }

  // Worker service endpoints (no auth required - internal service communication)
  @Post('job-update')
  @ApiOperation({ 
    summary: 'Send job status update (Internal API)',
    description: 'Used by worker service to send real-time job updates to connected clients'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        status: { type: 'string' },
        userId: { type: 'string' },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        message: { type: 'string' }
      },
      required: ['jobId', 'status', 'userId']
    }
  })
  @ApiResponse({ status: 200, description: 'Job update sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async receiveJobUpdate(@Body() jobUpdate: {
    jobId: string;
    status: string;
    userId: string;
    progress?: number;
    message?: string;
  }) {
    this.sseService.sendJobUpdate(
      jobUpdate.jobId,
      jobUpdate.status,
      jobUpdate.userId,
      jobUpdate.progress,
      jobUpdate.message
    );

    return { success: true, message: 'Job update sent' };
  }

  @Post('dataset-update')
  @ApiOperation({ 
    summary: 'Send dataset status update (Internal API)',
    description: 'Used by worker service to send real-time dataset updates to connected clients'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' },
        status: { type: 'string' },
        userId: { type: 'string' },
        findingsCount: { type: 'number', minimum: 0 }
      },
      required: ['datasetId', 'status', 'userId']
    }
  })
  @ApiResponse({ status: 200, description: 'Dataset update sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async receiveDatasetUpdate(@Body() datasetUpdate: {
    datasetId: string;
    status: string;
    userId: string;
    findingsCount?: number;
  }) {
    this.sseService.sendDatasetUpdate(
      datasetUpdate.datasetId,
      datasetUpdate.status,
      datasetUpdate.userId,
      datasetUpdate.findingsCount
    );

    return { success: true, message: 'Dataset update sent' };
  }

  @Post('notification')
  @ApiOperation({ 
    summary: 'Send notification (Internal API)',
    description: 'Used by worker service to send notifications to connected clients'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] }
      },
      required: ['userId', 'title', 'message']
    }
  })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async receiveNotification(@Body() notification: {
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }) {
    this.sseService.sendNotification(
      notification.userId,
      notification.title,
      notification.message,
      notification.type
    );

    return { success: true, message: 'Notification sent' };
  }
}