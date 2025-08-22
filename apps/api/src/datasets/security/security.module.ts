import { Module } from '@nestjs/common';
import { FileValidatorService } from './file-validator.service';
import { InputSanitizerService } from './input-sanitizer.service';

/**
 * Security Module
 * 
 * Centralized module for all security-related services.
 * Provides file validation, input sanitization, and security utilities.
 */
@Module({
  providers: [
    FileValidatorService,
    InputSanitizerService,
  ],
  exports: [
    FileValidatorService,
    InputSanitizerService,
  ],
})
export class SecurityModule {}