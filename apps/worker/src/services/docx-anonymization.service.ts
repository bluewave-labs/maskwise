import { SearchAndReplace } from 'edit-office-files';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { PIIFinding } from '../types/jobs.js';

/**
 * DOCX Anonymization Service
 * 
 * Handles anonymization of DOCX files while preserving the original document format.
 * Uses edit-office-files library to perform search and replace operations on PII entities
 * while maintaining document structure, formatting, styles, tables, and images.
 */

export interface DOCXPIIFinding extends PIIFinding {
  originalText: string;
  anonymizedText: string;
}

export interface DOCXAnonymizationResult {
  outputPath: string;
  originalSize: number;
  anonymizedSize: number;
  operationsCount: number;
  piiEntitiesProcessed: string[];
  success: boolean;
}

export class DOCXAnonymizationService {
  /**
   * Anonymize DOCX File
   * 
   * Takes a DOCX file and PII findings, creates an anonymized version while
   * preserving the original document structure and formatting.
   * 
   * @param sourcePath - Path to the original DOCX file
   * @param findings - Array of PII findings with original and anonymized text
   * @param outputPath - Path where anonymized DOCX will be saved
   * @returns Anonymization result with statistics
   */
  async anonymizeDOCX(
    sourcePath: string,
    findings: DOCXPIIFinding[],
    outputPath: string
  ): Promise<DOCXAnonymizationResult> {
    try {
      logger.info('Starting DOCX anonymization', {
        sourcePath: path.basename(sourcePath),
        outputPath: path.basename(outputPath),
        findingsCount: findings.length
      });

      // Validate source file exists and is accessible
      await this.validateSourceFile(sourcePath);
      
      // Get original file size
      const sourceStats = await fs.stat(sourcePath);
      const originalSize = sourceStats.size;

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Prepare search and replacement arrays
      const { searchTexts, replacementTexts, entityTypes } = this.prepareFindingsForReplacement(findings);

      if (searchTexts.length === 0) {
        logger.warn('No PII findings to anonymize, copying original file');
        await fs.copyFile(sourcePath, outputPath);
        
        const outputStats = await fs.stat(outputPath);
        return {
          outputPath,
          originalSize,
          anonymizedSize: outputStats.size,
          operationsCount: 0,
          piiEntitiesProcessed: [],
          success: true
        };
      }

      logger.info('Processing DOCX anonymization', {
        searchTexts: searchTexts.length,
        entityTypes: Array.from(entityTypes),
        outputPath: path.basename(outputPath)
      });

      // Perform search and replace using edit-office-files
      const searcher = new SearchAndReplace(sourcePath, searchTexts, replacementTexts, outputPath);
      await searcher.process();

      // Validate output file was created
      await this.validateOutputFile(outputPath);
      
      // Get anonymized file size
      const outputStats = await fs.stat(outputPath);
      const anonymizedSize = outputStats.size;

      const result: DOCXAnonymizationResult = {
        outputPath,
        originalSize,
        anonymizedSize,
        operationsCount: searchTexts.length,
        piiEntitiesProcessed: Array.from(entityTypes),
        success: true
      };

      logger.info('DOCX anonymization completed', {
        originalSize,
        anonymizedSize,
        operationsCount: result.operationsCount,
        piiEntitiesProcessed: result.piiEntitiesProcessed,
        outputPath: path.basename(outputPath)
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('DOCX anonymization failed', {
        sourcePath: path.basename(sourcePath),
        outputPath: path.basename(outputPath),
        error: errorMessage
      });

      throw new Error(`DOCX anonymization failed: ${errorMessage}`);
    }
  }

  /**
   * Prepare Findings for Replacement
   * 
   * Converts PII findings into search and replacement arrays needed by edit-office-files
   */
  private prepareFindingsForReplacement(findings: DOCXPIIFinding[]): {
    searchTexts: string[];
    replacementTexts: string[];
    entityTypes: Set<string>;
  } {
    const searchTexts: string[] = [];
    const replacementTexts: string[] = [];
    const entityTypes = new Set<string>();

    for (const finding of findings) {
      if (finding.originalText && finding.anonymizedText) {
        searchTexts.push(finding.originalText);
        replacementTexts.push(finding.anonymizedText);
        entityTypes.add(finding.entityType);
      }
    }

    logger.info('Prepared findings for replacement', {
      totalFindings: findings.length,
      validFindings: searchTexts.length,
      entityTypes: Array.from(entityTypes)
    });

    return { searchTexts, replacementTexts, entityTypes };
  }

  /**
   * Validate Source File
   * 
   * Ensures the source DOCX file exists and is accessible
   */
  private async validateSourceFile(sourcePath: string): Promise<void> {
    try {
      const stats = await fs.stat(sourcePath);
      
      if (!stats.isFile()) {
        throw new Error('Source path is not a file');
      }
      
      // Check file accessibility
      await fs.access(sourcePath, fs.constants.R_OK);
      
      // Verify it's a DOCX file (basic check)
      const ext = path.extname(sourcePath).toLowerCase();
      if (ext !== '.docx') {
        throw new Error(`Expected DOCX file, got: ${ext}`);
      }
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Source DOCX file not found: ${sourcePath}`);
      }
      throw error;
    }
  }

  /**
   * Validate Output File
   * 
   * Ensures the anonymized DOCX file was created successfully
   */
  private async validateOutputFile(outputPath: string): Promise<void> {
    try {
      const stats = await fs.stat(outputPath);
      
      if (!stats.isFile()) {
        throw new Error('Output file was not created');
      }
      
      if (stats.size === 0) {
        throw new Error('Output file is empty');
      }
      
    } catch (error) {
      throw new Error(`Failed to validate output file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Anonymized Text from Original
   * 
   * Converts original PII text to anonymized format using policy-based rules
   */
  generateAnonymizedText(originalText: string, entityType: string, action: string = 'mask'): string {
    if (!originalText) return originalText;

    switch (action.toLowerCase()) {
      case 'redact':
        return '[REDACTED]';
        
      case 'mask':
        return this.maskText(originalText, entityType);
        
      case 'replace':
        return this.getReplacementText(entityType);
        
      case 'hash':
        return this.hashText(originalText);
        
      default:
        return this.maskText(originalText, entityType);
    }
  }

  /**
   * Mask Text Based on Entity Type
   */
  private maskText(text: string, entityType: string): string {
    const length = text.length;
    
    switch (entityType.toUpperCase()) {
      case 'EMAIL_ADDRESS':
        // Keep first 3 chars and domain structure: john@company.com → joh***@***.com
        const emailParts = text.split('@');
        if (emailParts.length === 2) {
          const localPart = emailParts[0];
          const domainPart = emailParts[1];
          const maskedLocal = localPart.substring(0, Math.min(3, localPart.length)) + '***';
          const maskedDomain = '***.' + domainPart.split('.').pop();
          return `${maskedLocal}@${maskedDomain}`;
        }
        return '***@***.com';
        
      case 'PHONE_NUMBER':
        // Keep structure: (555) 123-4567 → (***) ***-****
        return text.replace(/\d/g, '*');
        
      case 'SSN':
        // Keep format: 123-45-6789 → ***-**-****
        return text.replace(/\d/g, '*');
        
      case 'CREDIT_CARD':
        // Keep last 4 digits: 4532-1234-5678-9012 → ****-****-****-9012
        if (length >= 4) {
          const lastFour = text.slice(-4);
          const masked = '*'.repeat(length - 4);
          return masked + lastFour;
        }
        return '*'.repeat(length);
        
      case 'PERSON':
        // Keep first and last character: John Smith → J*** S****
        const words = text.split(' ');
        return words.map(word => {
          if (word.length <= 2) return '*'.repeat(word.length);
          return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
        }).join(' ');
        
      case 'LOCATION':
        // Keep first char: Boston → B*****
        if (length <= 2) return '*'.repeat(length);
        return text[0] + '*'.repeat(length - 1);
        
      default:
        // Generic masking: keep first and last char
        if (length <= 2) return '*'.repeat(length);
        return text[0] + '*'.repeat(length - 2) + text[length - 1];
    }
  }

  /**
   * Get Replacement Text for Entity Type
   */
  private getReplacementText(entityType: string): string {
    const replacements: Record<string, string> = {
      'EMAIL_ADDRESS': 'user@example.com',
      'PHONE_NUMBER': '(555) 000-0000',
      'SSN': '000-00-0000',
      'CREDIT_CARD': '0000-0000-0000-0000',
      'PERSON': 'John Doe',
      'LOCATION': 'City, State',
      'ORGANIZATION': 'Company Inc.',
      'DATE_TIME': 'MM/DD/YYYY'
    };
    
    return replacements[entityType.toUpperCase()] || '[REPLACED]';
  }

  /**
   * Hash Text (Simple implementation)
   */
  private hashText(text: string): string {
    // Simple hash for demonstration - in production you might want crypto.createHash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `[HASH:${Math.abs(hash).toString(16)}]`;
  }
}

// Export singleton instance
export const docxAnonymizationService = new DOCXAnonymizationService();