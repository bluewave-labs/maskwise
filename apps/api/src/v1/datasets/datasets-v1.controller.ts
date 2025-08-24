import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyAuthGuard } from '../../auth/guards/api-key-auth.guard';
import { DatasetsService } from '../../datasets/datasets.service';
import { UploadFileDto } from '../../datasets/dto/upload-file.dto';

@ApiTags('v1-datasets')
@Controller('v1/datasets')
@UseGuards(ApiKeyAuthGuard)
@ApiBearerAuth()
export class DatasetsV1Controller {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file for PII analysis (API v1)' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or project' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async uploadFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
  ) {
    return this.datasetsService.uploadFile(file, uploadFileDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List datasets (API v1)' })
  @ApiResponse({ status: 200, description: 'List of datasets' })
  async listDatasets(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('projectId') projectId?: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    return this.datasetsService.findAll(req.user.id, {
      skip,
      take: limitNum,
      projectId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dataset details (API v1)' })
  @ApiResponse({ status: 200, description: 'Dataset details' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async getDataset(@Request() req, @Param('id') id: string) {
    return this.datasetsService.findOne(id, req.user.id);
  }

  @Get(':id/findings')
  @ApiOperation({ summary: 'Get PII findings for dataset (API v1)' })
  @ApiResponse({ status: 200, description: 'PII findings' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async getFindings(
    @Request() req,
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.datasetsService.getFindings(id, req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dataset (API v1)' })
  @ApiResponse({ status: 204, description: 'Dataset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async deleteDataset(@Request() req, @Param('id') id: string) {
    await this.datasetsService.delete(id, req.user.id);
  }
}