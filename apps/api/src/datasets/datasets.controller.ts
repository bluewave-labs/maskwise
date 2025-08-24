import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

import { DatasetsService } from './datasets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly, MemberAccess } from '../auth/decorators/roles.decorator';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { UploadFileDto } from './dto/upload-file.dto';

/**
 * Datasets Controller
 * 
 * Handles file upload, dataset management, and project statistics.
 * All endpoints require JWT authentication and implement proper security validation.
 * 
 * Key features:
 * - Secure file upload with type validation and size limits
 * - Dataset CRUD operations with user isolation
 * - Project-level statistics and analytics
 * - Comprehensive audit logging for all operations
 */

/**
 * Multer Storage Configuration
 * 
 * Configures secure file storage with unique naming to prevent conflicts.
 * Files are stored in ./uploads directory with timestamp-based naming.
 */
const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = extname(file.originalname);
    const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  },
});

/**
 * Enhanced File Security Filter
 * 
 * Multi-layered security validation for uploaded files:
 * 1. MIME type validation against whitelist
 * 2. File extension validation
 * 3. Filename security checks
 * 4. File size validation
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Comprehensive list of allowed file types for PII analysis
  const allowedMimeTypes = [
    // Text files - most common for PII data
    'text/plain',
    'text/csv',
    'application/json',
    'text/html',
    'text/xml',
    
    // Office documents - contain structured PII data
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Images - may contain PII via OCR
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'image/gif',
  ];

  // 1. MIME type validation
  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new BadRequestException(`File type ${file.mimetype} is not supported for PII analysis`), false);
    return;
  }

  // 2. File extension validation
  const allowedExtensions = [
    '.txt', '.csv', '.json', '.html', '.xml',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif'
  ];

  const fileExtension = extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    cb(new BadRequestException(`File extension ${fileExtension} is not allowed`), false);
    return;
  }

  // 3. Filename security checks
  const filename = file.originalname;
  
  // Check for null bytes (directory traversal attempts)
  if (filename.includes('\0')) {
    cb(new BadRequestException('Invalid characters in filename'), false);
    return;
  }

  // Check for path traversal attempts
  if (filename.includes('../') || filename.includes('..\\')) {
    cb(new BadRequestException('Path traversal attempt detected in filename'), false);
    return;
  }

  // Check for suspicious executables in filename
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar'];
  const hiddenExtensions = filename.split('.').slice(1, -1); // All extensions except the last one
  
  for (const ext of hiddenExtensions) {
    if (suspiciousExtensions.includes('.' + ext.toLowerCase())) {
      cb(new BadRequestException('Suspicious file extension detected'), false);
      return;
    }
  }

  // Check filename length
  if (filename.length > 255) {
    cb(new BadRequestException('Filename too long (max 255 characters)'), false);
    return;
  }

  // Check for control characters
  if (/[\x00-\x1f\x7f-\x9f]/.test(filename)) {
    cb(new BadRequestException('Invalid control characters in filename'), false);
    return;
  }

  // 4. Basic file size check (additional check beyond Multer limits)
  if (file.size && file.size > 100 * 1024 * 1024) { // 100MB
    cb(new BadRequestException('File size exceeds maximum limit of 100MB'), false);
    return;
  }

  // All checks passed
  cb(null, true);
};

@ApiTags('Datasets')
@Controller('datasets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Post('upload')
  @AdminOnly() // Only admins can upload files
  @ApiOperation({ summary: 'Upload file and create dataset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        projectId: {
          type: 'string',
          description: 'Project ID where file will be uploaded',
        },
        policyId: {
          type: 'string',
          description: 'Policy ID for processing (optional)',
        },
        description: {
          type: 'string',
          description: 'File description (optional)',
        },
      },
      required: ['file', 'projectId'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or bad request' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Additional security check - re-validate file extension against original name
    const allowedExtensions = [
      '.txt', '.csv', '.json', '.html', '.xml',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif'
    ];

    const fileExtension = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(`File extension ${fileExtension} is not allowed`);
    }

    return this.datasetsService.uploadFile(
      file,
      uploadFileDto,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all datasets for current user' })
  @ApiResponse({ status: 200, description: 'Datasets retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    return this.datasetsService.findAll(req.user.id, {
      skip,
      take: limitNum,
      projectId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dataset by ID' })
  @ApiResponse({ status: 200, description: 'Dataset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.datasetsService.findOne(id, req.user.id);
  }

  @Get('projects/:projectId/stats')
  @ApiOperation({ summary: 'Get project file statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getProjectStats(@Param('projectId') projectId: string, @Request() req) {
    return this.datasetsService.getProjectStats(projectId, req.user.id);
  }

  @Get(':id/findings')
  @ApiOperation({ summary: 'Get PII findings for dataset' })
  @ApiResponse({ status: 200, description: 'Findings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async getFindings(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.datasetsService.getFindings(id, req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id/anonymized/download')
  @ApiOperation({ summary: 'Download anonymized content in specified format' })
  @ApiResponse({ 
    status: 200, 
    description: 'Anonymized file downloaded successfully',
    headers: {
      'Content-Type': { description: 'MIME type of the file' },
      'Content-Disposition': { description: 'Attachment filename' }
    }
  })
  @ApiResponse({ status: 404, description: 'Dataset or anonymized content not found' })
  @ApiResponse({ status: 400, description: 'Invalid format or anonymization not completed' })
  async downloadAnonymizedContent(
    @Param('id') id: string,
    @Query('format') format: string = 'original',
    @Request() req,
    @Res() res: Response,
  ) {
    const result = await this.datasetsService.downloadAnonymizedContent(id, req.user.id, format);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    // Handle binary data (like PDFs) vs text data differently
    if ('isBuffer' in result && result.isBuffer) {
      res.setHeader('Content-Length', (result.content as Buffer).length);
      return res.end(result.content);
    } else {
      res.setHeader('Content-Length', (result.content as string).length);
      return res.send(result.content);
    }
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download original uploaded file' })
  @ApiResponse({ 
    status: 200, 
    description: 'Original file downloaded successfully',
    headers: {
      'Content-Type': { description: 'MIME type of the file' },
      'Content-Disposition': { description: 'Attachment filename' }
    }
  })
  @ApiResponse({ status: 404, description: 'Dataset or file not found' })
  @ApiResponse({ status: 400, description: 'Failed to read original file' })
  async downloadOriginalContent(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const result = await this.datasetsService.downloadOriginalContent(id, req.user.id);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.content.length);
    
    return res.send(result.content);
  }

  @Get(':id/anonymized')
  @ApiOperation({ summary: 'Get anonymized content for dataset' })
  @ApiResponse({ 
    status: 200, 
    description: 'Anonymized content retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            datasetId: { type: 'string' },
            anonymizedText: { type: 'string' },
            originalLength: { type: 'number' },
            anonymizedLength: { type: 'number' },
            operationsApplied: { type: 'number' },
            operations: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  start: { type: 'number' },
                  end: { type: 'number' },
                  entity_type: { type: 'string' },
                  text: { type: 'string' },
                  operator: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string' },
            format: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Dataset or anonymized content not found' })
  @ApiResponse({ status: 400, description: 'Anonymization not completed yet' })
  async getAnonymizedContent(
    @Param('id') id: string,
    @Request() req,
    @Query('format') format?: string,
  ) {
    return this.datasetsService.getAnonymizedContent(id, req.user.id, format);
  }

  @Get(':id/jobs/progress')
  @ApiOperation({ summary: 'Get job progress for dataset' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              status: { type: 'string' },
              progress: { type: 'number' },
              startedAt: { type: 'string' },
              endedAt: { type: 'string' },
              error: { type: 'string' },
              stage: { type: 'string' },
              estimatedCompletion: { type: 'string' }
            }
          }
        },
        overallProgress: { type: 'number' },
        currentStage: { type: 'string' },
        isProcessing: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async getJobProgress(@Param('id') id: string, @Request() req) {
    return this.datasetsService.getJobProgress(id, req.user.id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed dataset processing' })
  @ApiResponse({ status: 200, description: 'Dataset processing restarted successfully' })
  @ApiResponse({ status: 400, description: 'Dataset cannot be retried (not in failed state)' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async retryProcessing(@Param('id') id: string, @Request() req) {
    return this.datasetsService.retryProcessing(id, req.user.id);
  }

  @Delete(':id')
  @AdminOnly() // Only admins can delete datasets
  @ApiOperation({ summary: 'Delete dataset' })
  @ApiResponse({ status: 200, description: 'Dataset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.datasetsService.delete(id, req.user.id);
  }
}