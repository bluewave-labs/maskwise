import { IsString, IsOptional, IsEmail, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { NotificationPreferencesDto } from './notification-preferences.dto';

export class UpdateUserDto {
  @ApiProperty({
    example: 'john.doe@company.com',
    description: 'User email address',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    example: true,
    description: 'User active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'MEMBER',
    description: 'User role',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    type: NotificationPreferencesDto,
    description: 'User notification preferences',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}