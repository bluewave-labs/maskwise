import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

/**
 * Input Sanitizer Service
 * 
 * Provides comprehensive input validation and sanitization for all user inputs.
 * Prevents injection attacks, XSS, and other input-based security vulnerabilities.
 * 
 * Security features:
 * 1. SQL injection prevention
 * 2. XSS protection
 * 3. Path traversal prevention
 * 4. Command injection prevention
 * 5. NoSQL injection prevention
 * 6. LDAP injection prevention
 */
@Injectable()
export class InputSanitizerService {

  /**
   * Dangerous Characters and Patterns
   * 
   * Collections of characters and patterns that pose security risks.
   */
  private readonly DANGEROUS_CHARACTERS = {
    SQL_INJECTION: [
      "'", '"', ';', '--', '/*', '*/', 'xp_', 'sp_', 'exec', 'execute',
      'union', 'select', 'insert', 'update', 'delete', 'drop', 'create',
      'alter', 'truncate', 'grant', 'revoke'
    ],
    
    XSS_PATTERNS: [
      '<script', '</script>', '<iframe', '<object', '<embed', '<form',
      'javascript:', 'vbscript:', 'onload=', 'onerror=', 'onclick=',
      'onmouseover=', 'onfocus=', 'onblur=', 'onchange=', 'onsubmit='
    ],
    
    PATH_TRAVERSAL: [
      '../', '..\\', '/./', '\\.\\', '%2e%2e', '%2f', '%5c',
      '%252e', '%252f', '%255c', '..%2f', '..%5c'
    ],
    
    COMMAND_INJECTION: [
      '&&', '||', '|', ';', '`', '$', '$(', '${', '>', '>>', '<',
      '&', 'rm ', 'del ', 'format ', 'net ', 'ping ', 'wget ', 'curl '
    ],
    
    NOSQL_INJECTION: [
      '$where', '$ne', '$in', '$nin', '$not', '$or', '$and', '$nor',
      '$exists', '$type', '$mod', '$regex', '$text', '$search'
    ]
  };

  /**
   * Sanitize Text Input
   * 
   * Cleans and validates text input to prevent various injection attacks.
   * 
   * @param input - Raw text input
   * @param options - Sanitization options
   * @returns Sanitized text
   */
  sanitizeText(input: string, options: SanitizationOptions = {}): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    // 1. Length validation
    if (options.maxLength && sanitized.length > options.maxLength) {
      throw new BadRequestException(`Input exceeds maximum length of ${options.maxLength} characters`);
    }

    // 2. Character whitelist validation
    if (options.allowedCharacters) {
      const regex = new RegExp(`[^${options.allowedCharacters}]`, 'g');
      if (regex.test(sanitized)) {
        throw new BadRequestException('Input contains invalid characters');
      }
    }

    // 3. XSS prevention
    if (!options.allowHtml) {
      sanitized = this.removeXSSPatterns(sanitized);
    }

    // 4. SQL injection prevention
    if (!options.allowSpecialCharacters) {
      sanitized = this.removeSQLInjectionPatterns(sanitized);
    }

    // 5. Path traversal prevention
    sanitized = this.removePathTraversalPatterns(sanitized);

    // 6. Command injection prevention
    sanitized = this.removeCommandInjectionPatterns(sanitized);

    // 7. NoSQL injection prevention
    sanitized = this.removeNoSQLInjectionPatterns(sanitized);

    // 8. Unicode normalization
    sanitized = this.normalizeUnicode(sanitized);

    // 9. Final validation
    this.validateSanitizedInput(sanitized, options);

    return sanitized;
  }

  /**
   * Sanitize Filename
   * 
   * Specifically sanitizes filenames to prevent filesystem attacks.
   * 
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid filename provided');
    }

    let sanitized = filename.trim();

    // Remove path components
    sanitized = sanitized.replace(/.*[/\\]/, '');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

    // Remove multiple dots (prevent extension spoofing)
    sanitized = sanitized.replace(/\.{2,}/g, '.');

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

    // Prevent reserved Windows filenames
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
      'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
      'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    const nameWithoutExt = sanitized.replace(/\.[^.]*$/, '');
    if (reservedNames.includes(nameWithoutExt.toUpperCase())) {
      sanitized = `file_${sanitized}`;
    }

    // Ensure minimum length
    if (sanitized.length < 1) {
      throw new BadRequestException('Filename too short after sanitization');
    }

    // Ensure maximum length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }

    return sanitized;
  }

  /**
   * Sanitize Database Query Parameters
   * 
   * Specifically sanitizes parameters used in database queries.
   * 
   * @param params - Query parameters object
   * @returns Sanitized parameters
   */
  sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Sanitize key
      const sanitizedKey = this.sanitizeText(key, {
        maxLength: 100,
        allowedCharacters: 'a-zA-Z0-9_',
        allowHtml: false,
        allowSpecialCharacters: false
      });

      // Sanitize value based on type
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(value, {
          maxLength: 1000,
          allowHtml: false,
          allowSpecialCharacters: false
        });
      } else if (typeof value === 'number') {
        sanitized[sanitizedKey] = this.sanitizeNumber(value);
      } else if (typeof value === 'boolean') {
        sanitized[sanitizedKey] = Boolean(value);
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(item => 
          typeof item === 'string' ? this.sanitizeText(item) : item
        );
      } else {
        // Skip complex objects or null values
        continue;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize Number Input
   * 
   * Validates and sanitizes numeric input.
   */
  private sanitizeNumber(input: number, options: NumberSanitizationOptions = {}): number {
    if (typeof input !== 'number' || isNaN(input) || !isFinite(input)) {
      throw new BadRequestException('Invalid number provided');
    }

    if (options.min !== undefined && input < options.min) {
      throw new BadRequestException(`Number must be at least ${options.min}`);
    }

    if (options.max !== undefined && input > options.max) {
      throw new BadRequestException(`Number must be at most ${options.max}`);
    }

    if (options.integer && !Number.isInteger(input)) {
      throw new BadRequestException('Number must be an integer');
    }

    return input;
  }

  /**
   * Remove XSS Patterns
   */
  private removeXSSPatterns(input: string): string {
    let sanitized = input;

    // Remove script tags and event handlers
    for (const pattern of this.DANGEROUS_CHARACTERS.XSS_PATTERNS) {
      const regex = new RegExp(pattern, 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    // Encode remaining HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Remove SQL Injection Patterns
   */
  private removeSQLInjectionPatterns(input: string): string {
    let sanitized = input;

    for (const pattern of this.DANGEROUS_CHARACTERS.SQL_INJECTION) {
      // Escape special regex characters in the pattern
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedPattern, 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    // Remove SQL comments
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*.*?\*\//gs, '');

    return sanitized;
  }

  /**
   * Remove Path Traversal Patterns
   */
  private removePathTraversalPatterns(input: string): string {
    let sanitized = input;

    for (const pattern of this.DANGEROUS_CHARACTERS.PATH_TRAVERSAL) {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized;
  }

  /**
   * Remove Command Injection Patterns
   */
  private removeCommandInjectionPatterns(input: string): string {
    let sanitized = input;

    for (const pattern of this.DANGEROUS_CHARACTERS.COMMAND_INJECTION) {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized;
  }

  /**
   * Remove NoSQL Injection Patterns
   */
  private removeNoSQLInjectionPatterns(input: string): string {
    let sanitized = input;

    for (const pattern of this.DANGEROUS_CHARACTERS.NOSQL_INJECTION) {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized;
  }

  /**
   * Normalize Unicode Characters
   */
  private normalizeUnicode(input: string): string {
    return input.normalize('NFC');
  }

  /**
   * Final validation after sanitization
   */
  private validateSanitizedInput(input: string, options: SanitizationOptions): void {
    // Check for suspicious patterns that might have survived sanitization
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /return\s+/i,
      /\b(alert|confirm|prompt)\s*\(/i,
      /\b(document|window|location)\b/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        throw new BadRequestException('Input contains suspicious patterns');
      }
    }

    // Check for excessive special character density
    const specialCharCount = (input.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const specialCharRatio = specialCharCount / input.length;

    if (specialCharRatio > 0.3 && !options.allowSpecialCharacters) {
      throw new BadRequestException('Input contains too many special characters');
    }
  }
}

/**
 * Sanitization Options Interface
 */
export interface SanitizationOptions {
  maxLength?: number;
  allowedCharacters?: string;
  allowHtml?: boolean;
  allowSpecialCharacters?: boolean;
  allowEmptyString?: boolean;
}

/**
 * Number Sanitization Options Interface
 */
export interface NumberSanitizationOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}