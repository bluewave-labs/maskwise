import { Job } from 'bullmq';
import { BaseProcessor } from './base-processor.js';
import { presidioService, AnalysisResult } from '../services/presidio.service.js';
import { policyService, PolicyConfig } from '../services/policy.service.js';
import { textExtractionService, TextExtractionResult } from '../services/text-extraction.service.js';
import { logger } from '../utils/logger.js';
import { JobData, JobType, JobStatus, PIIAnalysisJobData } from '../types/jobs.js';
import { db } from '../database/prisma.js';

/**
 * PII Analysis Processor
 * 
 * Processes uploaded files to detect Personally Identifiable Information (PII)
 * using Microsoft Presidio. This processor handles the core PII detection pipeline
 * including text extraction, analysis, and results storage.
 * 
 * Key responsibilities:
 * - Extract text content from uploaded files
 * - Analyze text for PII entities using Presidio
 * - Store findings in database with confidence scores
 * - Create follow-up anonymization jobs if required by policy
 * - Update dataset status and metadata
 * 
 * Supported workflows:
 * 1. Text files: Direct PII analysis
 * 2. Documents: Extract text first, then analyze
 * 3. Images: OCR extraction first, then analyze
 */
export class PIIAnalysisProcessor extends BaseProcessor {
  protected jobType = JobType.PII_ANALYSIS;

  /**
   * Process PII Analysis Job
   * 
   * Main entry point for PII detection processing. Handles the complete workflow
   * from text extraction to results storage.
   * 
   * @param job - BullMQ job containing dataset and analysis configuration
   */
  protected async process(job: Job<JobData>): Promise<any> {
    const { datasetId } = job.data;
    
    try {
      // Update job status to processing
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 10);
      
      // Get dataset information
      const dataset = await db.client.dataset.findUnique({
        where: { id: datasetId! },
        include: { 
          project: true
        }
      });

      // Get job information separately
      const currentJob = await db.client.job.findUnique({
        where: { id: job.data.jobId },
        include: { policy: true }
      });

      if (!dataset) {
        throw new Error(`Dataset not found: ${datasetId}`);
      }

      if (!currentJob) {
        throw new Error(`Job not found: ${job.data.jobId}`);
      }

      logger.info('Starting PII analysis', {
        datasetId,
        jobId: job.data.jobId,
        filename: dataset.filename,
        fileType: dataset.fileType,
        policyId: currentJob.policyId
      });

      // Update progress
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 20);

      // Extract text content based on file type
      const jobData = job.data as PIIAnalysisJobData;
      const extractionResult = await this.extractTextContentWithMetadata(dataset, jobData.filePath);
      const textContent = extractionResult.text;
      
      if (!textContent || textContent.trim().length === 0) {
        logger.warn('No text content found in file', { datasetId, filename: dataset.filename });
        return {
          message: 'No text content found for analysis',
          entitiesFound: 0,
          entityTypes: []
        };
      }

      // Update progress
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 40);

      // Configure analysis based on policy
      const analysisConfig = await this.buildAnalysisConfig(currentJob.policy, textContent);
      
      // Perform PII analysis using Presidio
      const analysisResults = await presidioService.analyzeText(analysisConfig);
      
      logger.info('PII analysis completed', {
        datasetId,
        jobId: job.data.jobId,
        entitiesFound: analysisResults.length,
        entityTypes: [...new Set(analysisResults.map(r => r.entity_type))]
      });

      // Update progress
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 60);

      // Filter and store findings based on policy
      const policyConfig = await policyService.getPolicyConfig(currentJob.policyId!);
      const filteredResults = this.filterResultsByPolicy(analysisResults, policyConfig);
      
      logger.info('PII findings filtered by policy', {
        datasetId,
        totalFindings: analysisResults.length,
        filteredFindings: filteredResults.length,
        policyId: currentJob.policyId
      });
      
      // Store findings in database
      await this.storePIIFindings(datasetId!, filteredResults, textContent, policyConfig);

      // Update progress
      await this.updateJobStatus(job.data.jobId, JobStatus.PROCESSING, 80);

      // Update dataset status with extraction metadata
      await db.client.dataset.update({
        where: { id: datasetId! },
        data: {
          status: 'COMPLETED',
          rowCount: this.countTextLines(textContent),
          columnCount: this.estimateColumns(textContent, dataset.fileType),
          extractionMethod: extractionResult.extractionMethod,
          extractionConfidence: extractionResult.confidence,
          ocrMetadata: extractionResult.extractionMethod === 'ocr' ? extractionResult.metadata : null,
          updatedAt: new Date()
        }
      });

      // Create anonymization job if policy requires it
      const shouldAnonymize = await this.shouldCreateAnonymizationJob(currentJob.policyId!, filteredResults);
      if (shouldAnonymize) {
        await this.createAnonymizationJob(datasetId!, job.data.jobId, currentJob.policyId!);
      }

      // Log audit entry
      await this.logAuditAction(currentJob.createdById, 'VIEW', 'dataset', datasetId!, {
        entitiesFound: analysisResults.length,
        entityTypes: [...new Set(analysisResults.map(r => r.entity_type))],
        policyApplied: currentJob.policy.name
      });

      // Return result for job completion
      return {
        entitiesFound: filteredResults.length,
        entityTypes: [...new Set(filteredResults.map(r => r.entity_type))],
        totalScanned: analysisResults.length,
        policyApplied: currentJob.policy.name,
        message: `PII analysis completed. Found ${filteredResults.length} entities (${analysisResults.length} total scanned, filtered by policy).`
      };

    } catch (error) {
      logger.error('PII analysis failed', {
        datasetId,
        jobId: job.data.jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * Extract Text Content with Metadata from Dataset
   * 
   * Extracts text content from uploaded files using the enhanced text extraction service.
   * Returns complete extraction result including OCR confidence and quality metadata.
   * 
   * @param dataset - Dataset record with file information
   * @param absoluteFilePath - Absolute path to the file from job data
   * @returns Complete extraction result with metadata
   */
  private async extractTextContentWithMetadata(dataset: any, absoluteFilePath?: string): Promise<TextExtractionResult> {
    try {
      // Use absolute path from job data if provided, fallback to dataset sourcePath
      const filePath = absoluteFilePath || dataset.sourcePath;
      
      logger.info('Starting enhanced text extraction', {
        datasetId: dataset.id,
        filename: dataset.filename,
        fileType: dataset.fileType,
        filePath: filePath.replace(/^.*\/([^\/]+)$/, '***/$1') // Hide sensitive path info
      });

      // Use the enhanced text extraction service
      const extractionResult: TextExtractionResult = await textExtractionService.extractText(
        filePath,
        dataset.fileType,
        dataset.mimeType
      );

      // Log extraction results
      logger.info('Text extraction completed', {
        datasetId: dataset.id,
        filename: dataset.filename,
        extractionMethod: extractionResult.extractionMethod,
        confidence: extractionResult.confidence,
        textLength: extractionResult.text.length,
        metadata: extractionResult.metadata
      });

      // Log extraction metadata for monitoring (metadata field not in schema yet)
      if (extractionResult.metadata) {
        logger.info('Text extraction metadata', {
          datasetId: dataset.id,
          method: extractionResult.extractionMethod,
          confidence: extractionResult.confidence,
          textLength: extractionResult.text.length,
          ...extractionResult.metadata
        });
      }

      // Return complete extraction result with metadata
      return extractionResult;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Enhanced text extraction failed', {
        datasetId: dataset.id,
        filename: dataset.filename,
        fileType: dataset.fileType,
        error: errorMessage
      });
      throw new Error(`Text extraction failed: ${errorMessage}`);
    }
  }


  /**
   * Build Analysis Configuration
   * 
   * Creates Presidio analysis configuration based on YAML policy settings.
   * Uses the policy service to parse YAML configurations and extract
   * entity types, confidence thresholds, and analysis parameters.
   * 
   * @param policy - Policy record from database
   * @param textContent - Text to analyze
   * @returns Analysis configuration for Presidio
   */
  private async buildAnalysisConfig(policy: any, textContent: string) {
    let policyConfig: PolicyConfig;
    
    try {
      // Get parsed policy configuration from policy service
      policyConfig = await policyService.getPolicyConfig(policy.id);
      
      logger.info('Policy configuration loaded', {
        policyId: policy.id,
        policyName: policy.name,
        entities: policyConfig.entities,
        confidenceThreshold: policyConfig.confidence_threshold
      });
      
    } catch (error) {
      logger.warn('Failed to load policy configuration, using default', {
        policyId: policy.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to legacy parsing
      const legacyConfig = typeof policy.config === 'string' 
        ? JSON.parse(policy.config) 
        : policy.config;
      
      policyConfig = {
        entities: legacyConfig.entities || ['EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD'],
        confidence_threshold: legacyConfig.confidence_threshold || 0.5,
        entity_configurations: {},
        anonymization: {
          default_action: 'redact',
          preserve_format: true,
          audit_trail: true
        },
        scope: {
          file_types: ['txt', 'csv', 'pdf'],
          max_file_size: '100MB'
        }
      };
    }

    const analysisConfig = {
      text: textContent,
      language: 'en', // TODO: Add language detection or configuration
      score_threshold: policyConfig.confidence_threshold,
      correlation_id: `dataset_${Date.now()}_${policy.id}`
    };

    // Only include entities filter if configured, otherwise Presidio will detect all types
    if (policyConfig.entities.length > 0) {
      (analysisConfig as any).entities = policyConfig.entities;
    }

    return analysisConfig;
  }

  /**
   * Filter Analysis Results by Policy
   * 
   * Filters Presidio analysis results based on policy configuration.
   * Only includes entities that meet policy requirements for confidence
   * thresholds and entity types.
   * 
   * @param analysisResults - Raw results from Presidio
   * @param policyConfig - Parsed policy configuration
   * @returns Filtered results that meet policy criteria
   */
  private filterResultsByPolicy(
    analysisResults: AnalysisResult[], 
    policyConfig: PolicyConfig
  ): AnalysisResult[] {
    return analysisResults.filter(result => {
      // Check if this entity type should be processed according to policy
      const shouldProcess = policyService.shouldProcessEntity(
        policyConfig, 
        result.entity_type, 
        result.score
      );
      
      if (!shouldProcess) {
        logger.debug('Entity filtered out by policy', {
          entityType: result.entity_type,
          confidence: result.score,
          policyThreshold: policyConfig.entity_configurations[result.entity_type]?.confidence_threshold || policyConfig.confidence_threshold
        });
      }
      
      return shouldProcess;
    });
  }

  /**
   * Store PII Findings
   * 
   * Saves detected PII entities to the database as Finding records.
   * Now includes policy-based action configuration for each finding.
   * 
   * @param datasetId - Dataset ID
   * @param analysisResults - Filtered PII entities from analysis
   * @param textContent - Original text content
   * @param policyConfig - Policy configuration for actions
   */
  private async storePIIFindings(
    datasetId: string, 
    analysisResults: AnalysisResult[], 
    textContent: string,
    policyConfig: PolicyConfig
  ): Promise<void> {
    try {
      const findings = analysisResults.map(result => {
        // Extract the actual text that was detected
        const detectedText = textContent.substring(result.start, result.end);
        
        // Calculate line and column information
        const beforeText = textContent.substring(0, result.start);
        const lineNumber = (beforeText.match(/\n/g) || []).length + 1;
        
        // Get entity-specific configuration from policy
        const entityConfig = policyService.getEntityConfig(policyConfig, result.entity_type);
        const action = entityConfig?.action || policyConfig.anonymization.default_action;
        
        // Mask the detected text for storage based on policy action
        const maskedText = this.maskSensitiveTextWithAction(
          detectedText, 
          result.entity_type, 
          action,
          entityConfig?.replacement
        );
        
        return {
          datasetId,
          entityType: result.entity_type as any, // Cast to enum
          text: maskedText,
          confidence: result.score,
          startOffset: result.start,
          endOffset: result.end,
          lineNumber,
          contextBefore: this.getContext(textContent, result.start, -20),
          contextAfter: this.getContext(textContent, result.end, 20)
        };
      });

      // Batch insert findings
      await db.client.finding.createMany({
        data: findings
      });

      logger.info('PII findings stored', {
        datasetId,
        findingsCount: findings.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to store PII findings', {
        datasetId,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Mask Sensitive Text with Policy Action
   * 
   * Creates a masked version of detected PII based on policy configuration.
   * Supports different anonymization actions: redact, mask, replace, encrypt.
   * 
   * @param text - Original sensitive text
   * @param entityType - Type of PII entity
   * @param action - Policy-defined action for this entity
   * @param replacement - Custom replacement text (if applicable)
   * @returns Anonymized text based on policy action
   */
  private maskSensitiveTextWithAction(
    text: string, 
    entityType: string, 
    action: string,
    replacement?: string
  ): string {
    switch (action) {
      case 'redact':
        // Complete redaction with entity type indicator
        return `[${entityType}]`;
        
      case 'mask':
        // Partial masking preserving structure
        if (text.length <= 4) {
          return '*'.repeat(text.length);
        }
        const firstChar = text.charAt(0);
        const lastChar = text.charAt(text.length - 1);
        const middleMask = '*'.repeat(text.length - 2);
        return `${firstChar}${middleMask}${lastChar}`;
        
      case 'replace':
        // Replace with custom or default replacement
        if (replacement) {
          return replacement;
        }
        // Default replacements by entity type
        const defaultReplacements: Record<string, string> = {
          'EMAIL_ADDRESS': 'user@example.com',
          'SSN': 'XXX-XX-XXXX',
          'CREDIT_CARD': 'XXXX-XXXX-XXXX-XXXX',
          'PHONE_NUMBER': 'XXX-XXX-XXXX',
          'PERSON': '[PERSON]',
          'DATE_TIME': '[DATE]',
          'IP_ADDRESS': 'XXX.XXX.XXX.XXX',
          'URL': 'https://example.com'
        };
        return defaultReplacements[entityType] || `[${entityType}]`;
        
      case 'encrypt':
        // Simple encryption placeholder (would use proper encryption in production)
        return `[ENCRYPTED:${entityType}:${text.length}]`;
        
      default:
        // Fallback to basic masking
        return this.maskSensitiveText(text, entityType);
    }
  }

  /**
   * Mask Sensitive Text (Legacy)
   * 
   * Fallback method for basic masking when policy action is not specified.
   * 
   * @param text - Original sensitive text
   * @param entityType - Type of PII entity
   * @returns Masked text safe for storage
   */
  private maskSensitiveText(text: string, _entityType: string): string {
    // Show first and last characters for context, mask the middle
    if (text.length <= 4) {
      return '*'.repeat(text.length);
    }
    
    const firstChar = text.charAt(0);
    const lastChar = text.charAt(text.length - 1);
    const middleMask = '*'.repeat(text.length - 2);
    
    return `${firstChar}${middleMask}${lastChar}`;
  }

  /**
   * Get Text Context
   * 
   * Extracts context around a position in text for better understanding.
   * 
   * @param text - Full text content
   * @param position - Position in text
   * @param length - Length of context (positive for after, negative for before)
   * @returns Context text
   */
  private getContext(text: string, position: number, length: number): string {
    if (length > 0) {
      // Context after position
      return text.substring(position, Math.min(position + length, text.length));
    } else {
      // Context before position
      const start = Math.max(0, position + length);
      return text.substring(start, position);
    }
  }

  /**
   * Count Text Lines
   * 
   * Counts the number of lines in text content.
   * 
   * @param text - Text content
   * @returns Number of lines
   */
  private countTextLines(text: string): number {
    return (text.match(/\n/g) || []).length + 1;
  }

  /**
   * Estimate Columns
   * 
   * Estimates the number of columns based on file type and content.
   * 
   * @param text - Text content
   * @param fileType - File type
   * @returns Estimated column count
   */
  private estimateColumns(text: string, fileType: string): number {
    if (fileType === 'CSV') {
      // Count commas in first line
      const firstLine = text.split('\n')[0] || '';
      return (firstLine.match(/,/g) || []).length + 1;
    }
    
    if (fileType === 'JSONL') {
      // Try to parse first line and count keys
      try {
        const firstLine = text.split('\n')[0] || '';
        const parsed = JSON.parse(firstLine);
        return Object.keys(parsed).length;
      } catch {
        return 1;
      }
    }
    
    // Default for text files
    return 1;
  }

  /**
   * Should Create Anonymization Job
   * 
   * Determines if an anonymization job should be created based on YAML policy
   * configuration and the number of PII findings detected.
   * 
   * @param policyId - Policy ID to check configuration
   * @param analysisResults - Filtered PII analysis results
   * @returns True if anonymization job should be created
   */
  private async shouldCreateAnonymizationJob(
    policyId: string, 
    analysisResults: AnalysisResult[]
  ): Promise<boolean> {
    try {
      // Get policy configuration
      const policyConfig = await policyService.getPolicyConfig(policyId);
      
      // Check if any entity has an action that requires anonymization
      const hasAnonymizationActions = analysisResults.some(result => {
        const entityConfig = policyService.getEntityConfig(policyConfig, result.entity_type);
        const action = entityConfig?.action || policyConfig.anonymization.default_action;
        return ['mask', 'replace', 'encrypt'].includes(action);
      });
      
      // Create anonymization job if:
      // 1. PII was found
      // 2. Policy has anonymization actions configured
      const shouldCreate = analysisResults.length > 0 && hasAnonymizationActions;
      
      logger.info('Anonymization job decision', {
        policyId,
        findingsCount: analysisResults.length,
        hasAnonymizationActions,
        shouldCreate
      });
      
      return shouldCreate;
      
    } catch (error) {
      logger.error('Error checking anonymization policy', {
        policyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Conservative fallback: create anonymization job if PII found
      return analysisResults.length > 0;
    }
  }

  /**
   * Create Anonymization Job
   * 
   * Creates a follow-up job for anonymizing the dataset based on PII findings.
   * 
   * @param datasetId - Dataset ID
   * @param parentJobId - Parent job ID
   * @param policyId - Policy ID
   */
  private async createAnonymizationJob(datasetId: string, parentJobId: string, policyId: string): Promise<void> {
    try {
      logger.info('Starting anonymization job creation', {
        datasetId,
        parentJobId,
        policyId
      });

      // Get the dataset to find the user
      const dataset = await db.client.dataset.findUnique({
        where: { id: datasetId },
        include: { project: true }
      });

      logger.info('Dataset retrieved for anonymization job', {
        datasetId,
        datasetFound: !!dataset,
        projectId: dataset?.projectId,
        userId: dataset?.project?.userId
      });

      if (!dataset) {
        throw new Error(`Dataset not found: ${datasetId}`);
      }

      // Get PII findings for anonymization
      const findings = await db.client.finding.findMany({
        where: { datasetId },
        select: {
          entityType: true,
          text: true,
          startOffset: true,
          endOffset: true,
          confidence: true
        }
      });

      logger.info('PII findings retrieved for anonymization', {
        datasetId,
        findingsCount: findings.length,
        entityTypes: [...new Set(findings.map(f => f.entityType))]
      });

      // Create anonymization job
      logger.info('Creating anonymization job in database', {
        datasetId,
        userId: dataset.project.userId,
        policyId,
        parentJobId
      });

      const anonymizationJob = await db.client.job.create({
        data: {
          type: 'ANONYMIZE', // Fixed: Use correct Prisma enum value
          status: 'QUEUED',
          datasetId,
          createdById: dataset.project.userId,
          policyId,
          metadata: {
            parentJobId,
            anonymizationType: 'full'
          }
        }
      });

      logger.info('Anonymization job created successfully', {
        anonymizationJobId: anonymizationJob.id,
        jobType: anonymizationJob.type,
        status: anonymizationJob.status
      });

      // Add job to anonymization queue
      logger.info('Adding job to anonymization queue', {
        anonymizationJobId: anonymizationJob.id,
        findingsCount: findings.length,
        sourceFilePath: dataset.sourcePath
      });

      const { anonymizationQueue } = await import('../queue/queues.js');
      
      await anonymizationQueue.add(
        'anonymize-dataset',
        {
          jobId: anonymizationJob.id,
          userId: dataset.project.userId,
          projectId: dataset.projectId,
          datasetId,
          policyId,
          findingsData: findings,
          sourceFilePath: dataset.sourcePath,
          outputType: 'json'
        },
        {
          priority: 5, // Lower priority than PII analysis
          delay: 1000, // Small delay to ensure PII analysis is fully complete
        }
      );

      logger.info('Job successfully added to anonymization queue', {
        anonymizationJobId: anonymizationJob.id,
        queueName: 'anonymization'
      });

      logger.info('Anonymization job created and queued', {
        datasetId,
        parentJobId,
        anonymizationJobId: anonymizationJob.id,
        findingsCount: findings.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create anonymization job', {
        datasetId,
        parentJobId,
        error: errorMessage
      });
      // Don't throw - this shouldn't fail the PII analysis
    }
  }
}