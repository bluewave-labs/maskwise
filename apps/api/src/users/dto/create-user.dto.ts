import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'ADMIN',
  DATA_ENGINEER = 'DATA_ENGINEER',
  ML_ENGINEER = 'ML_ENGINEER',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER'
}

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe@company.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'User password',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({
    example: 'Doe', 
    description: 'User last name',
  })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    example: 'DATA_ENGINEER',
    description: 'User role',
    enum: UserRole,
    default: UserRole.DATA_ENGINEER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}