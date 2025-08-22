import { Injectable, BadRequestException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * File Validator Service
 * 
 * Provides comprehensive file security validation beyond basic MIME type checking.
 * Implements multiple layers of security validation to prevent malicious file uploads.
 * 
 * Security layers:
 * 1. File signature validation (magic bytes)
 * 2. Content scanning for suspicious patterns
 * 3. File structure validation
 * 4. Size and naming constraints
 * 5. Executable detection
 */
@Injectable()
export class FileValidatorService {

  /**
   * File Type Signatures (Magic Bytes)
   * 
   * Maps file types to their expected byte signatures for validation.
   * Used to verify that file content matches the declared MIME type.
   */
  private readonly FILE_SIGNATURES = {
    // Text files
    'text/plain': [], // No specific signature for plain text
    'text/csv': [], // CSV is plain text
    'application/json': [], // JSON is plain text
    
    // PDF files
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    
    // Microsoft Office (modern)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // ZIP signature
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04], // ZIP signature
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': [0x50, 0x4B, 0x03, 0x04], // ZIP signature
    
    // Microsoft Office (legacy)
    'application/msword': [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE signature
    'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE signature
    'application/vnd.ms-powerpoint': [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE signature
    
    // Images
    'image/jpeg': [0xFF, 0xD8, 0xFF], // JPEG signature
    'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
    'image/tiff': [0x49, 0x49, 0x2A, 0x00], // TIFF little-endian
    'image/bmp': [0x42, 0x4D], // BMP signature
    'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF signature
  };

  /**
   * Suspicious File Patterns
   * 
   * Byte patterns that indicate potentially malicious content.
   * These patterns are commonly found in executable files or malware.
   */
  private readonly SUSPICIOUS_PATTERNS = [
    // Executable headers
    [0x4D, 0x5A], // MZ (Windows executable)
    [0x7F, 0x45, 0x4C, 0x46], // ELF (Linux executable)
    [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O (macOS executable)
    [0xFE, 0xED, 0xFA, 0xCE], // Mach-O 32-bit
    [0xFE, 0xED, 0xFA, 0xCF], // Mach-O 64-bit
    
    // Script patterns (first few bytes)
    [0x23, 0x21], // Shebang (#!)
    
    // Archive bombs indicators
    [0x1F, 0x8B], // GZIP
    [0x42, 0x5A, 0x68], // BZIP2
  ];

  /**
   * Validate File Security
   * 
   * Performs comprehensive security validation on uploaded files.
   * 
   * @param file - Multer file object
   * @param declaredMimeType - MIME type declared by client
   * @returns ValidationResult with status and details
   */
  async validateFile(file: Express.Multer.File, declaredMimeType: string): Promise<FileValidationResult> {
    try {
      // Read first 1KB for signature analysis
      const buffer = await readFile(file.path);
      const header = buffer.slice(0, 1024);

      // 1. Validate file signature matches declared MIME type
      const signatureValidation = this.validateFileSignature(header, declaredMimeType);
      if (!signatureValidation.isValid) {
        return {
          isValid: false,
          reason: 'FILE_SIGNATURE_MISMATCH',
          details: signatureValidation.details,
          riskLevel: 'HIGH'
        };
      }

      // 2. Scan for suspicious patterns
      const suspiciousPatternCheck = this.scanForSuspiciousPatterns(header);
      if (!suspiciousPatternCheck.isValid) {
        return {
          isValid: false,
          reason: 'SUSPICIOUS_CONTENT_DETECTED',
          details: suspiciousPatternCheck.details,
          riskLevel: 'CRITICAL'
        };
      }

      // 3. Validate file name and extension
      const nameValidation = this.validateFileName(file.originalname);
      if (!nameValidation.isValid) {
        return {
          isValid: false,
          reason: 'INVALID_FILENAME',
          details: nameValidation.details,
          riskLevel: 'MEDIUM'
        };
      }

      // 4. Check for embedded executables (for office docs)
      if (this.isOfficeDocument(declaredMimeType)) {
        const embeddedCheck = await this.checkForEmbeddedExecutables(buffer);
        if (!embeddedCheck.isValid) {
          return {
            isValid: false,
            reason: 'EMBEDDED_EXECUTABLE_DETECTED',
            details: embeddedCheck.details,
            riskLevel: 'HIGH'
          };
        }
      }

      // 5. Validate file size consistency
      const sizeValidation = this.validateFileSize(file.size, buffer.length);
      if (!sizeValidation.isValid) {
        return {
          isValid: false,
          reason: 'FILE_SIZE_INCONSISTENCY',
          details: sizeValidation.details,
          riskLevel: 'MEDIUM'
        };
      }

      return {
        isValid: true,
        reason: 'VALIDATION_PASSED',
        details: 'File passed all security validation checks',
        riskLevel: 'NONE',
        metadata: {
          detectedFileType: this.detectFileTypeFromSignature(header),
          contentHash: crypto.createHash('sha256').update(buffer).digest('hex'),
          fileSize: buffer.length
        }
      };

    } catch (error) {
      return {
        isValid: false,
        reason: 'VALIDATION_ERROR',
        details: `Failed to validate file: ${error.message}`,
        riskLevel: 'HIGH'
      };
    }
  }

  /**
   * Validate File Signature
   * 
   * Checks if the file's magic bytes match the declared MIME type.
   */
  private validateFileSignature(header: Buffer, mimeType: string): ValidationResult {
    const expectedSignature = this.FILE_SIGNATURES[mimeType];
    
    // Some file types (like text files) don't have specific signatures
    if (!expectedSignature || expectedSignature.length === 0) {
      return { isValid: true, details: 'No signature validation required for this file type' };
    }

    // Check if header starts with expected signature
    for (let i = 0; i < expectedSignature.length; i++) {
      if (header[i] !== expectedSignature[i]) {
        return {
          isValid: false,
          details: `File signature mismatch. Expected ${mimeType} but file signature indicates different type.`
        };
      }
    }

    return { isValid: true, details: 'File signature matches declared MIME type' };
  }

  /**
   * Scan for Suspicious Patterns
   * 
   * Looks for byte patterns commonly found in malicious files.
   */
  private scanForSuspiciousPatterns(header: Buffer): ValidationResult {
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (this.hasPattern(header, pattern)) {
        return {
          isValid: false,
          details: `Suspicious pattern detected: potential executable or malicious content`
        };
      }
    }

    // Check for common malware strings
    const headerStr = header.toString('ascii', 0, Math.min(512, header.length));
    const suspiciousStrings = ['eval(', 'exec(', '<script', 'javascript:', 'vbscript:', 'PowerShell'];
    
    for (const suspiciousStr of suspiciousStrings) {
      if (headerStr.toLowerCase().includes(suspiciousStr.toLowerCase())) {
        return {
          isValid: false,
          details: `Suspicious content detected: ${suspiciousStr}`
        };
      }
    }

    return { isValid: true, details: 'No suspicious patterns detected' };
  }

  /**
   * Validate File Name
   * 
   * Checks for suspicious file names and extensions.
   */
  private validateFileName(originalname: string): ValidationResult {
    // Check for null bytes (directory traversal attempts)
    if (originalname.includes('\0')) {
      return { isValid: false, details: 'Null bytes detected in filename' };
    }

    // Check for path traversal attempts
    if (originalname.includes('../') || originalname.includes('..\\')) {
      return { isValid: false, details: 'Path traversal attempt detected' };
    }

    // Check for suspicious extensions
    const suspiciousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
      '.msi', '.dll', '.app', '.deb', '.rpm', '.sh', '.ps1', '.hta'
    ];

    const ext = path.extname(originalname).toLowerCase();
    if (suspiciousExtensions.includes(ext)) {
      return { isValid: false, details: `Suspicious file extension: ${ext}` };
    }

    // Check for double extensions (common malware technique)
    const nameWithoutExt = path.basename(originalname, ext);
    if (nameWithoutExt.includes('.')) {
      const hiddenExt = path.extname(nameWithoutExt).toLowerCase();
      if (suspiciousExtensions.includes(hiddenExt)) {
        return { isValid: false, details: `Hidden suspicious extension detected: ${hiddenExt}` };
      }
    }

    return { isValid: true, details: 'Filename validation passed' };
  }

  /**
   * Check for Embedded Executables
   * 
   * Scans office documents for embedded executables or macros.
   */
  private async checkForEmbeddedExecutables(buffer: Buffer): Promise<ValidationResult> {
    const content = buffer.toString('ascii').toLowerCase();
    
    // Check for macro indicators
    const macroIndicators = ['vba', 'macro', 'autoopen', 'autoexec', 'shell', 'wscript'];
    for (const indicator of macroIndicators) {
      if (content.includes(indicator)) {
        return {
          isValid: false,
          details: `Potential macro or embedded code detected: ${indicator}`
        };
      }
    }

    // Check for embedded executables in ZIP-based office formats
    if (content.includes('pk') && (content.includes('.exe') || content.includes('.dll'))) {
      return {
        isValid: false,
        details: 'Potential embedded executable detected in office document'
      };
    }

    return { isValid: true, details: 'No embedded executables detected' };
  }

  /**
   * Validate File Size Consistency
   * 
   * Checks for size inconsistencies that might indicate tampering.
   */
  private validateFileSize(reportedSize: number, actualSize: number): ValidationResult {
    if (Math.abs(reportedSize - actualSize) > 1024) { // Allow 1KB variance
      return {
        isValid: false,
        details: `File size inconsistency: reported ${reportedSize} bytes, actual ${actualSize} bytes`
      };
    }

    return { isValid: true, details: 'File size validation passed' };
  }

  /**
   * Detect File Type from Signature
   * 
   * Attempts to determine the actual file type based on magic bytes.
   */
  private detectFileTypeFromSignature(header: Buffer): string {
    for (const [mimeType, signature] of Object.entries(this.FILE_SIGNATURES)) {
      if (signature.length > 0 && this.hasPattern(header, signature)) {
        return mimeType;
      }
    }
    return 'unknown';
  }

  /**
   * Check if buffer contains specific byte pattern
   */
  private hasPattern(buffer: Buffer, pattern: number[]): boolean {
    if (pattern.length === 0 || buffer.length < pattern.length) {
      return false;
    }

    for (let i = 0; i <= buffer.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (buffer[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  /**
   * Check if MIME type represents an Office document
   */
  private isOfficeDocument(mimeType: string): boolean {
    return mimeType.includes('officedocument') || 
           mimeType.includes('msword') || 
           mimeType.includes('ms-excel') || 
           mimeType.includes('ms-powerpoint');
  }
}

/**
 * File Validation Result Interface
 */
export interface FileValidationResult {
  isValid: boolean;
  reason: string;
  details: string;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: {
    detectedFileType?: string;
    contentHash?: string;
    fileSize?: number;
  };
}

/**
 * Internal Validation Result Interface
 */
interface ValidationResult {
  isValid: boolean;
  details: string;
}