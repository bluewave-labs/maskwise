import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateDatasetDto {
  @ApiProperty({ description: 'Dataset name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Dataset description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Project ID', required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}