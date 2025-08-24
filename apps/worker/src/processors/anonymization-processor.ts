import { Job } from 'bullmq';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseProcessor } from './base-processor.js';
import { presidioService, AnonymizationRequest, AnonymizationResult } from '../services/presidio.service.js';
import { policyService, PolicyConfig } from '../services/policy.service.js';
import { pdfAnonymizationService, PDFPIIFinding } from '../services/pdf-anonymization.service.js';
import { docxAnonymizationService, DOCXPIIFinding } from '../services/docx-anonymization.service.js';
import { db } from '../database/prisma.js';
import { logger } from '../utils/logger.js';
import { JobStatus, AnonymizationJobData, PIIFinding } from '../types/jobs.js';

/**
 * Anonymization Processor
 * 
 * Handles policy-driven data anonymization using Microsoft Presidio.
 * Takes PII findings and applies policy-defined anonymization operators
 * to generate masked/redacted outputs while preserving data utility.
 */
export class AnonymizationProcessor extends BaseProcessor {
  protected jobType = 'anonymization';
  
  /**
   * Process Anonymization Job
   * 
   * Applies policy-based anonymization to detected PII entities:
   * 1. Retrieve original text content
   * 2. Get PII findings from analysis results
   * 3. Apply policy-defined anonymization operators
   * 4. Generate anonymized output with Presidio
   * 5. Store anonymized content securely
   * 
   * @param job - BullMQ job with anonymization data
   * @returns Processing result
   */
  async process(job: Job<AnonymizationJobData>): Promise<any> {
    const { datasetId, policyId, findingsData, sourceFilePath, outputType } = job.data;

    try {
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 10, 'Starting anonymization process');

      // Get dataset information to determine file type
      const dataset = await db.client.dataset.findUnique({
        where: { id: datasetId }
      });

      if (!dataset) {
        throw new Error(`Dataset not found: ${datasetId}`);
      }

      logger.info('Starting anonymization processing', {
        jobId: job.id,
        datasetId,
        policyId,
        fileType: dataset.fileType,
        findingsCount: findingsData?.length || 0,
        outputType: outputType || 'json'
      });

      // Check if this is a PDF file - use direct PDF anonymization
      if (dataset.fileType.toUpperCase() === 'PDF') {
        return await this.processPDFAnonymization(job, dataset, findingsData || [], sourceFilePath || '');
      }

      // Check if this is a DOCX file - use direct DOCX anonymization to preserve format
      if (dataset.fileType.toUpperCase() === 'DOCX') {
        return await this.processDOCXAnonymization(job, dataset, findingsData || [], sourceFilePath || '');
      }

      // Step 1: Retrieve original text content (for other file types)
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 20, 'Retrieving original content');
      const originalText = await this.getOriginalText(sourceFilePath || '', datasetId || '');
      
      if (!originalText || originalText.length === 0) {
        throw new Error('No original text content available for anonymization');
      }

      // Step 2: Get policy configuration for anonymization rules
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 30, 'Loading policy configuration');
      const policyConfig = await policyService.getPolicyConfig(policyId);

      // Step 3: Convert findings to Presidio analyzer results format
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 40, 'Converting findings to analyzer format');
      const analyzerResults = this.convertFindingsToAnalyzerResults(findingsData || []);

      // Step 4: Build anonymization operators based on policy
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 50, 'Building anonymization operators');
      const anonymizers = this.buildAnonymizationOperators(policyConfig, findingsData || []);

      // Step 5: Apply anonymization using Presidio
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 70, 'Applying anonymization operators');
      const anonymizationRequest: AnonymizationRequest = {
        text: originalText,
        analyzer_results: analyzerResults,
        anonymizers: anonymizers,
        conflict_resolution: 'merge_similar_or_contained'
      };

      const anonymizationResult = await presidioService.anonymizeText(anonymizationRequest);

      // Step 6: Store anonymized content
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 85, 'Storing anonymized output');
      const outputPath = await this.storeAnonymizedContent(
        datasetId || '',
        anonymizationResult,
        outputType || 'json',
        originalText.length,
        dataset.fileType,
        dataset.filename,
        sourceFilePath || ''
      );

      // Step 7: Update database with anonymization results
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 95, 'Updating database records');
      await this.updateDatasetWithAnonymization(datasetId || '', {
        outputPath,
        originalLength: originalText.length,
        anonymizedLength: anonymizationResult.text.length,
        operationsCount: anonymizationResult.items?.length || 0,
        outputType: outputType || 'json'
      });

      await this.updateJobStatus(job.data.jobId, JobStatus.COMPLETED, 100, 'Anonymization completed successfully');

      logger.info('Anonymization processing completed', {
        jobId: job.id,
        datasetId,
        originalLength: originalText.length,
        anonymizedLength: anonymizationResult.text.length,
        operationsApplied: anonymizationResult.items?.length || 0,
        outputPath
      });

      return {
        success: true,
        anonymizationResult: {
          originalLength: originalText.length,
          anonymizedLength: anonymizationResult.text.length,
          operationsCount: anonymizationResult.items?.length || 0,
          outputPath,
          outputType: outputType || 'json'
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown anonymization error';
      
      logger.error('Anonymization processing failed', {
        jobId: job.id,
        datasetId,
        policyId,
        error: errorMessage
      });

      await this.updateJobStatus(job.data.jobId, JobStatus.FAILED, 0, `Anonymization failed: ${errorMessage}`);

      throw error;
    }
  }

  /**
   * Process PDF Anonymization
   * 
   * Handles PDF-specific anonymization using PDF-lib for direct document
   * modification while preserving format and structure.
   * 
   * @param job - BullMQ job with anonymization data  
   * @param dataset - Dataset information
   * @param findings - PII findings to anonymize
   * @param sourceFilePath - Path to original PDF file
   * @returns Processing result
   */
  private async processPDFAnonymization(
    job: Job<AnonymizationJobData>,
    dataset: any,
    findings: PIIFinding[],
    sourceFilePath: string
  ): Promise<any> {
    try {
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 30, 'Starting PDF anonymization');
      
      logger.info('Processing PDF anonymization', {
        datasetId: dataset.id,
        filename: dataset.filename,
        findingsCount: findings.length
      });

      // Convert PII findings to PDF format
      const pdfFindings: PDFPIIFinding[] = findings.map(finding => ({
        entityType: finding.entityType,
        text: finding.text,
        start: finding.start,
        end: finding.end,
        confidence: finding.confidence,
        action: finding.action || 'redact',
        replacement: finding.replacement
      }));

      // Resolve absolute path for the source file
      let absoluteSourcePath: string;
      if (path.isAbsolute(sourceFilePath)) {
        absoluteSourcePath = sourceFilePath;
      } else {
        // Resolve relative to the project root where uploads directory is located
        const projectRoot = path.resolve(process.cwd(), '..');
        const apiRoot = path.join(projectRoot, 'api');
        absoluteSourcePath = path.resolve(apiRoot, sourceFilePath);
      }
      
      logger.info('Resolved PDF source path', {
        originalPath: sourceFilePath,
        absolutePath: absoluteSourcePath.replace(/^.*\/([^\/]+)$/, '***/$1'), // Hide sensitive path info
        exists: await this.fileExists(absoluteSourcePath)
      });

      // Generate output path for anonymized PDF
      const storageDir = process.env.STORAGE_DIR || './storage';
      const outputDir = path.join(storageDir, 'anonymized');
      await fs.mkdir(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(
        outputDir, 
        `${dataset.id}_anonymized_${timestamp}.pdf`
      );

      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 60, 'Applying PDF anonymization');

      // Use PDF anonymization service with absolute path
      const result = await pdfAnonymizationService.anonymizePDF(
        absoluteSourcePath,
        pdfFindings,
        outputPath
      );

      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 90, 'Updating database records');

      // Update dataset with anonymization results
      await this.updateDatasetWithAnonymization(dataset.id, {
        outputPath: result.outputPath,
        originalLength: result.originalSize,
        anonymizedLength: result.anonymizedSize,
        operationsCount: result.operationsCount,
        outputType: 'pdf'
      });

      await this.updateJobStatus(job.data.jobId, JobStatus.COMPLETED, 100, 'PDF anonymization completed');

      logger.info('PDF anonymization completed', {
        datasetId: dataset.id,
        originalSize: result.originalSize,
        anonymizedSize: result.anonymizedSize,
        operationsCount: result.operationsCount,
        outputPath: result.outputPath.replace(/^.*\/([^\/]+)$/, '***/$1')
      });

      return {
        success: true,
        anonymizationResult: {
          originalLength: result.originalSize,
          anonymizedLength: result.anonymizedSize,
          operationsCount: result.operationsCount,
          outputPath: result.outputPath,
          outputType: 'pdf',
          piiEntitiesProcessed: result.piiEntitiesProcessed
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown PDF anonymization error';
      
      logger.error('PDF anonymization failed', {
        datasetId: dataset.id,
        filename: dataset.filename,
        error: errorMessage
      });

      await this.updateJobStatus(job.data.jobId, JobStatus.FAILED, 0, `PDF anonymization failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Process DOCX Anonymization
   * 
   * Handles direct DOCX anonymization while preserving document format.
   * Uses edit-office-files library to perform search and replace operations
   * on PII entities within the DOCX structure.
   * 
   * @param job - BullMQ job data
   * @param dataset - Dataset information
   * @param findings - PII findings to anonymize
   * @param sourceFilePath - Path to original DOCX file
   * @returns Processing result
   */
  private async processDOCXAnonymization(
    job: Job<AnonymizationJobData>,
    dataset: any,
    findings: PIIFinding[],
    sourceFilePath: string
  ): Promise<any> {
    try {
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 30, 'Processing DOCX anonymization');

      logger.info('Processing DOCX anonymization', {
        datasetId: dataset.id,
        filename: dataset.filename,
        findingsCount: findings.length
      });

      // Convert PIIFindings to DOCXPIIFindings format
      const docxFindings: DOCXPIIFinding[] = await this.convertPIIFindingsToDOCXFindings(findings);

      // Resolve absolute path to source DOCX file
      let absoluteSourcePath: string;
      if (path.isAbsolute(sourceFilePath)) {
        absoluteSourcePath = sourceFilePath;
      } else {
        // Resolve relative to project root or API service location
        const projectRoot = process.cwd();
        const apiRoot = path.join(projectRoot, 'api');
        absoluteSourcePath = path.resolve(apiRoot, sourceFilePath);
      }
      
      logger.info('Resolved DOCX source path', {
        originalPath: sourceFilePath,
        absolutePath: absoluteSourcePath.replace(/^.*\/([^\/]+)$/, '***/$1'), // Hide sensitive path info
        exists: await this.fileExists(absoluteSourcePath)
      });

      // Generate output path for anonymized DOCX
      const storageDir = process.env.STORAGE_DIR || './storage';
      const outputDir = path.join(storageDir, 'anonymized');
      await fs.mkdir(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(
        outputDir, 
        `${dataset.id}_anonymized_${timestamp}.docx`
      );

      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 60, 'Applying DOCX anonymization');

      // Use DOCX anonymization service
      const result = await docxAnonymizationService.anonymizeDOCX(
        absoluteSourcePath,
        docxFindings,
        outputPath
      );

      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 90, 'Updating database records');

      // Update dataset with anonymization results
      await this.updateDatasetWithAnonymization(dataset.id, {
        outputPath: result.outputPath,
        originalLength: result.originalSize,
        anonymizedLength: result.anonymizedSize,
        operationsCount: result.operationsCount,
        outputType: 'docx'
      });

      await this.updateJobStatus(job.data.jobId, JobStatus.COMPLETED, 100, 'DOCX anonymization completed');

      logger.info('DOCX anonymization completed', {
        datasetId: dataset.id,
        originalSize: result.originalSize,
        anonymizedSize: result.anonymizedSize,
        operationsCount: result.operationsCount,
        outputPath: result.outputPath.replace(/^.*\/([^\/]+)$/, '***/$1')
      });

      return {
        success: true,
        anonymizationResult: {
          originalLength: result.originalSize,
          anonymizedLength: result.anonymizedSize,
          operationsCount: result.operationsCount,
          outputPath: result.outputPath,
          outputType: 'docx',
          piiEntitiesProcessed: result.piiEntitiesProcessed
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown DOCX anonymization error';
      
      logger.error('DOCX anonymization failed', {
        datasetId: dataset.id,
        filename: dataset.filename,
        error: errorMessage
      });

      await this.updateJobStatus(job.data.jobId, JobStatus.FAILED, 0, `DOCX anonymization failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get Original Text Content
   * 
   * Retrieves the original text that needs to be anonymized.
   * This could be from file or from previous processing steps.
   * 
   * @param sourceFilePath - Path to source file
   * @param datasetId - Dataset identifier
   * @returns Original text content
   */
  private async getOriginalText(sourceFilePath: string, datasetId: string): Promise<string> {
    try {
      // Convert relative path to absolute path
      // Files are stored relative to the API service, not the worker service
      let absolutePath: string;
      if (path.isAbsolute(sourceFilePath)) {
        absolutePath = sourceFilePath;
      } else {
        // Resolve relative to the API service directory (one level up, then into apps/api)
        const projectRoot = path.resolve(process.cwd(), '..');
        const apiRoot = path.join(projectRoot, 'api');
        absolutePath = path.resolve(apiRoot, sourceFilePath);
      }
      
      logger.debug('Attempting to read original text', {
        datasetId,
        sourceFilePath,
        absolutePath,
        cwd: process.cwd()
      });

      // First try to read from the source file path
      if (sourceFilePath && await this.fileExists(absolutePath)) {
        const content = await fs.readFile(absolutePath, 'utf-8');
        logger.debug('Original text retrieved from source file', {
          datasetId,
          filePath: path.basename(sourceFilePath),
          contentLength: content.length
        });
        return content;
      }

      // If source file not available, we might need to re-extract text
      // For now, throw an error to indicate this scenario
      throw new Error(`Source file not available for anonymization. Tried: ${absolutePath}`);

    } catch (error) {
      logger.error('Failed to retrieve original text', {
        datasetId,
        sourceFilePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Convert PII Findings to Presidio Analyzer Results
   * 
   * Converts our findings format to the format expected by Presidio anonymizer.
   * 
   * @param findings - Array of PII findings from analysis
   * @returns Array of analyzer results for Presidio
   */
  private convertFindingsToAnalyzerResults(findings: PIIFinding[]): any[] {
    return findings.map(finding => ({
      entity_type: finding.entityType,
      start: finding.startOffset,
      end: finding.endOffset,
      score: finding.confidence,
      recognition_metadata: {
        recognizer_identifier: 'presidio-recognizer',
        recognizer_name: finding.entityType
      }
    }));
  }

  /**
   * Build Anonymization Operators
   * 
   * Creates Presidio anonymization operators based on policy configuration
   * and the specific entities found in the text.
   * 
   * @param policyConfig - Policy configuration with anonymization rules
   * @param findings - PII findings to determine which operators to use
   * @returns Anonymization operators map for Presidio
   */
  private buildAnonymizationOperators(policyConfig: PolicyConfig, findings: PIIFinding[]): Record<string, any> {
    const operators: Record<string, any> = {};
    
    // Get unique entity types from findings
    const foundEntityTypes = new Set(
      findings.map(f => f.entityType).filter(Boolean)
    );

    // Build operators for each found entity type based on policy
    foundEntityTypes.forEach(entityType => {
      const entityConfig = policyConfig.entity_configurations?.[entityType];
      
      if (entityConfig && entityConfig.action) {
        // Map policy action to Presidio operator
        operators[entityType] = this.mapPolicyActionToOperator(entityConfig.action, entityType);
      } else {
        // Use policy default anonymizer if no specific entity config
        const defaultAction = policyConfig.anonymization?.default_action || 'mask';
        operators[entityType] = this.mapPolicyActionToOperator(defaultAction, entityType);
      }
    });

    logger.debug('Built anonymization operators', {
      entityTypes: Array.from(foundEntityTypes),
      operatorsCount: Object.keys(operators).length
    });

    return operators;
  }

  /**
   * Map Policy Action to Presidio Operator
   * 
   * Converts policy-defined actions (redact, mask, replace) to Presidio operators.
   * 
   * @param action - Policy action (redact, mask, replace, etc.)
   * @param entityType - Entity type for context-specific operators
   * @returns Presidio operator configuration
   */
  private mapPolicyActionToOperator(action: string, entityType: string): any {
    switch (action.toLowerCase()) {
      case 'redact':
        return { type: 'redact' };
      
      case 'mask':
        return {
          type: 'mask',
          masking_char: '*',
          chars_to_mask: this.getDefaultMaskLength(entityType),
          from_end: true
        };
      
      case 'replace':
        return {
          type: 'replace',
          new_value: this.getDefaultReplacement(entityType)
        };
      
      case 'hash':
        return {
          type: 'hash',
          hash_type: 'sha256'
        };

      default:
        // Default to redaction for unknown actions
        return { type: 'redact' };
    }
  }

  /**
   * Get Default Mask Length for Entity Type
   * 
   * Returns appropriate mask length based on entity type.
   */
  private getDefaultMaskLength(entityType: string): number {
    const maskLengths: Record<string, number> = {
      'EMAIL_ADDRESS': 6,
      'PHONE_NUMBER': 4,
      'SSN': 4,
      'CREDIT_CARD': 8,
      'PERSON': 5,
      'LOCATION': 4,
      'ORGANIZATION': 6
    };
    
    return maskLengths[entityType] || 4;
  }

  /**
   * Get Default Replacement for Entity Type
   * 
   * Returns context-appropriate replacement text.
   */
  private getDefaultReplacement(entityType: string): string {
    const replacements: Record<string, string> = {
      'EMAIL_ADDRESS': '[EMAIL_REDACTED]',
      'PHONE_NUMBER': '[PHONE_REDACTED]',
      'SSN': '[SSN_REDACTED]',
      'CREDIT_CARD': '[CARD_REDACTED]',
      'PERSON': '[NAME_REDACTED]',
      'LOCATION': '[LOCATION_REDACTED]',
      'ORGANIZATION': '[ORG_REDACTED]'
    };
    
    return replacements[entityType] || '[REDACTED]';
  }

  /**
   * Store Anonymized Content
   * 
   * Saves the anonymized output to secure storage with proper formatting.
   * For images, creates a comprehensive anonymization report instead of trying to modify the image.
   * 
   * @param datasetId - Dataset identifier
   * @param anonymizationResult - Result from Presidio anonymization
   * @param outputType - Output format (json, text, csv)
   * @param originalLength - Original text length for metrics
   * @param fileType - Original file type (PNG, JPEG, TXT, etc.)
   * @param originalFilename - Original filename
   * @param sourceFilePath - Path to original file
   * @returns Path to stored anonymized content
   */
  private async storeAnonymizedContent(
    datasetId: string,
    anonymizationResult: AnonymizationResult,
    outputType: string,
    originalLength: number,
    fileType: string,
    originalFilename: string,
    sourceFilePath: string
  ): Promise<string> {
    const storageDir = process.env.STORAGE_DIR || './storage';
    const outputDir = path.join(storageDir, 'anonymized');
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const isImageFile = ['PNG', 'JPEG', 'JPG', 'TIFF', 'BMP', 'GIF'].includes(fileType.toUpperCase());
    
    // For images, create a comprehensive report instead of just text
    let filename: string;
    let content: string;
    
    if (isImageFile) {
      // For images, always create a JSON report with image information
      filename = `${datasetId}_anonymized_report_${timestamp}.json`;
      content = JSON.stringify({
        reportType: 'IMAGE_ANONYMIZATION_REPORT',
        originalFile: {
          name: originalFilename,
          type: fileType,
          path: path.basename(sourceFilePath), // Only store the filename for security
        },
        extractedText: {
          original: anonymizationResult.text, // This is actually the anonymized text from Presidio
          length: anonymizationResult.text.length
        },
        anonymizationSummary: {
          operationsApplied: anonymizationResult.items?.length || 0,
          operations: anonymizationResult.items || [],
          piiEntitiesProcessed: [...new Set((anonymizationResult.items || []).map(item => item.entity_type))],
        },
        metadata: {
          originalTextLength: originalLength,
          anonymizedTextLength: anonymizationResult.text.length,
          processingTimestamp: new Date().toISOString(),
          datasetId,
          note: 'This report contains the PII-anonymized text extracted from the image. The original image remains unchanged.'
        }
      }, null, 2);
    } else {
      // For text-based files, use the original logic
      filename = `${datasetId}_anonymized_${timestamp}.${outputType}`;
      
      switch (outputType.toLowerCase()) {
        case 'json':
          content = JSON.stringify({
            anonymizedText: anonymizationResult.text,
            originalLength,
            anonymizedLength: anonymizationResult.text.length,
            operationsApplied: anonymizationResult.items?.length || 0,
            operations: anonymizationResult.items || [],
            timestamp: new Date().toISOString(),
            datasetId
          }, null, 2);
          break;
          
        case 'text':
        case 'txt':
          content = anonymizationResult.text;
          break;
          
        default:
          // Default to JSON format
          content = JSON.stringify({
            anonymizedText: anonymizationResult.text,
            metadata: {
              originalLength,
              anonymizedLength: anonymizationResult.text.length,
              operationsCount: anonymizationResult.items?.length || 0
            }
          }, null, 2);
          break;
      }
    }

    const outputPath = path.join(outputDir, filename);

    await fs.writeFile(outputPath, content, 'utf-8');
    
    logger.info('Anonymized content stored', {
      datasetId,
      outputPath: filename, // Store relative path only in logs
      outputType: isImageFile ? 'json_report' : outputType,
      fileType,
      isImageFile,
      fileSize: content.length
    });

    return outputPath;
  }

  /**
   * Update Dataset with Anonymization Results
   * 
   * Updates the dataset record with anonymization metadata.
   * 
   * @param datasetId - Dataset identifier
   * @param results - Anonymization results metadata
   */
  private async updateDatasetWithAnonymization(datasetId: string, results: {
    outputPath: string;
    originalLength: number;
    anonymizedLength: number;
    operationsCount: number;
    outputType: string;
  }): Promise<void> {
    try {
      await db.client.dataset.update({
        where: { id: datasetId },
        data: {
          status: 'COMPLETED',
          outputPath: results.outputPath, // Store the full path to anonymized file
          updatedAt: new Date()
        }
      });

      // Create audit log entry
      await this.logAuditAction(
        'system', // For now, use system as userId - this should be passed from job data
        'DATASET_ANONYMIZED',
        'Dataset',
        datasetId,
        JSON.stringify({
          outputPath: path.basename(results.outputPath),
          originalLength: results.originalLength,
          anonymizedLength: results.anonymizedLength,
          operationsCount: results.operationsCount,
          outputType: results.outputType,
          reductionPercentage: ((results.originalLength - results.anonymizedLength) / results.originalLength * 100).toFixed(2)
        })
      );

      logger.info('Dataset updated with anonymization results', {
        datasetId,
        operationsCount: results.operationsCount
      });

    } catch (error) {
      logger.error('Failed to update dataset with anonymization results', {
        datasetId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - this is not critical for the anonymization process
    }
  }

  /**
   * Convert PII Findings to DOCX PII Findings
   * 
   * Converts our PIIFinding format to DOCXPIIFinding format required by 
   * the DOCX anonymization service. This includes generating anonymized text
   * based on the detected entity type and the configured policy action.
   * 
   * @param findings - Array of PII findings from analysis
   * @returns Array of DOCX findings with original and anonymized text
   */
  private async convertPIIFindingsToDOCXFindings(findings: PIIFinding[]): Promise<DOCXPIIFinding[]> {
    const docxFindings: DOCXPIIFinding[] = [];
    
    for (const finding of findings) {
      // Extract original text from the context if available, or use the text property
      const originalText = finding.text || finding.context?.substring(
        finding.startOffset, 
        finding.endOffset
      ) || '[UNKNOWN_TEXT]';
      
      // Generate anonymized text based on entity type
      // Use the DOCX anonymization service's text generation logic
      const anonymizedText = docxAnonymizationService.generateAnonymizedText(
        originalText,
        finding.entityType,
        'mask' // Default action - in future this should come from policy configuration
      );
      
      // Create DOCX finding with all required properties from PIIFinding
      const docxFinding: DOCXPIIFinding = {
        // Base PIIFinding properties
        id: finding.id,
        datasetId: finding.datasetId,
        entityType: finding.entityType,
        text: finding.text,
        confidence: finding.confidence,
        startOffset: finding.startOffset,
        endOffset: finding.endOffset,
        lineNumber: finding.lineNumber,
        columnNumber: finding.columnNumber,
        context: finding.context,
        createdAt: finding.createdAt,
        
        // Additional DOCX-specific properties
        originalText,
        anonymizedText
      };
      
      docxFindings.push(docxFinding);
    }
    
    logger.info('Converted PII findings to DOCX findings', {
      originalCount: findings.length,
      convertedCount: docxFindings.length,
      entityTypes: [...new Set(findings.map(f => f.entityType))]
    });
    
    return docxFindings;
  }

  /**
   * Check if File Exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      logger.debug('File access check failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// Export singleton instance
export const anonymizationProcessor = new AnonymizationProcessor();