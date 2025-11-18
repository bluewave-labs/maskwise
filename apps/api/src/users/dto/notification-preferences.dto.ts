import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * User notification preferences
 * Controls which types of notifications the user wants to receive
 */
export class NotificationPreferencesDto {
  @ApiProperty({
    description: 'Enable email notifications',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiProperty({
    description: 'Enable in-app notifications',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiProperty({
    description: 'Receive job completion notifications',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  jobCompletionEnabled?: boolean;

  @ApiProperty({
    description: 'Receive security alert notifications',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  securityAlertsEnabled?: boolean;

  @ApiProperty({
    description: 'Receive system maintenance notifications',
    example: true,
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  systemMaintenanceEnabled?: boolean;

  @ApiProperty({
    description: 'Notification categories to mute',
    example: ['SYSTEM'],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mutedCategories?: string[];

  @ApiProperty({
    description: 'Quiet hours start (24-hour format, e.g., "22:00")',
    example: '22:00',
    required: false
  })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiProperty({
    description: 'Quiet hours end (24-hour format, e.g., "08:00")',
    example: '08:00',
    required: false
  })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;
}
