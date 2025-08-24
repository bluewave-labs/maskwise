import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @ApiProperty({ description: 'Process file immediately after upload', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  processImmediately?: boolean;
}