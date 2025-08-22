import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ description: 'Project ID to upload file to' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Policy ID to apply for processing', required: false })
  @IsOptional()
  @IsString()
  policyId?: string;

  @ApiProperty({ description: 'File description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}