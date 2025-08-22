import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { Config } from '../config/index.js';

/**
 * Presidio Integration Service
 * 
 * Provides integration with Microsoft Presidio for PII detection and anonymization.
 * This service handles communication with both the Analyzer and Anonymizer components
 * running as Docker services.
 * 
 * Key features:
 * - PII entity detection using Presidio Analyzer
 * - Text anonymization using configurable operators
 * - Support for multiple languages and entity types
 * - Confidence scoring and filtering
 * - Error handling and retry mechanisms
 * 
 * @see https://microsoft.github.io/presidio/
 */

/**
 * Presidio Analysis Result
 * Represents a detected PII entity with location and confidence information
 */
export interface AnalysisResult {
  /** Type of PII entity (e.g., PERSON, EMAIL_ADDRESS, PHONE_NUMBER) */
  entity_type: string;
  /** Start position of entity in text */
  start: number;
  /** End position of entity in text */
  end: number;
  /** Confidence score (0.0 - 1.0) */
  score: number;
  /** Detailed analysis information */
  analysis_explanation?: {
    /** Name of recognizer that detected the entity */
    recognizer: string;
    /** Pattern name used for detection */
    pattern_name?: string;
    /** Original confidence score before any adjustments */
    original_score: number;
    /** Human-readable explanation of detection */
    textual_explanation?: string;
  };
}

/**
 * Presidio Analysis Request
 * Configuration for PII detection analysis
 */
export interface AnalysisRequest {
  /** Text content to analyze */
  text: string;
  /** Language code (default: 'en') */
  language?: string;
  /** Filter to specific entity types (optional) */
  entities?: string[];
  /** Minimum confidence score threshold */
  score_threshold?: number;
  /** Unique correlation ID for tracking */
  correlation_id?: string;
}

/**
 * Anonymization Operator Configuration
 * Defines how to anonymize a specific entity type
 */
export interface AnonymizerOperator {
  /** Type of anonymization operation */
  type: 'replace' | 'redact' | 'mask' | 'hash' | 'encrypt';
  /** New value for replacement (replace operator) */
  new_value?: string;
  /** Character to use for masking (mask operator) */
  masking_char?: string;
  /** Number of characters to mask (mask operator) */
  chars_to_mask?: number;
  /** Mask from end instead of beginning (mask operator) */
  from_end?: boolean;
  /** Hash algorithm to use (hash operator) */
  hash_type?: 'md5' | 'sha256' | 'sha512';
  /** Encryption key (encrypt operator) */
  encrypt_key?: string;
}

/**
 * Anonymization Request
 * Configuration for text anonymization
 */
export interface AnonymizationRequest {
  /** Original text to anonymize */
  text: string;
  /** Anonymization operators for each entity type */
  anonymizers: Record<string, AnonymizerOperator>;
  /** Analysis results from Presidio Analyzer */
  analyzer_results: AnalysisResult[];
  /** Conflict resolution strategy for overlapping entities */
  conflict_resolution?: 'merge_similar_or_contained' | 'remove_conflicts';
}

/**
 * Anonymization Response
 * Result of text anonymization operation
 */
export interface AnonymizationResult {
  /** Anonymized text */
  text: string;
  /** Details of applied anonymization operations */
  items: Array<{
    /** Start position in original text */
    start: number;
    /** End position in original text */
    end: number;
    /** Type of entity anonymized */
    entity_type: string;
    /** Original text that was anonymized */
    text: string;
    /** Anonymization operator that was applied */
    operator: string;
  }>;
}

/**
 * Presidio Service
 * 
 * Main service class for interacting with Presidio Analyzer and Anonymizer services.
 * Handles all PII detection and anonymization operations with proper error handling
 * and logging.
 */
export class PresidioService {
  private analyzerClient: AxiosInstance;
  private anonymizerClient: AxiosInstance;
  
  constructor(
    private analyzerUrl: string = Config.presidio.analyzerUrl,
    private anonymizerUrl: string = Config.presidio.anonymizerUrl
  ) {
    // Configure Analyzer HTTP client
    this.analyzerClient = axios.create({
      baseURL: this.analyzerUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Configure Anonymizer HTTP client
    this.anonymizerClient = axios.create({
      baseURL: this.anonymizerUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request/response interceptors for logging
    this.setupInterceptors();
  }

  /**
   * Analyze Text for PII Entities
   * 
   * Sends text to Presidio Analyzer to detect PII entities with confidence scores.
   * 
   * @param request - Analysis configuration
   * @returns Array of detected PII entities with locations and scores
   */
  async analyzeText(request: AnalysisRequest): Promise<AnalysisResult[]> {
    try {
      logger.info('Starting PII analysis', {
        textLength: request.text.length,
        language: request.language || 'en',
        entities: request.entities,
        correlationId: request.correlation_id
      });

      const response = await this.analyzerClient.post('/analyze', {
        text: request.text,
        language: request.language || 'en',
        entities: request.entities,
        score_threshold: request.score_threshold || 0.5,
        correlation_id: request.correlation_id
      });

      const results: AnalysisResult[] = response.data;
      
      logger.info('PII analysis completed', {
        entitiesFound: results.length,
        entityTypes: [...new Set(results.map(r => r.entity_type))],
        correlationId: request.correlation_id
      });

      return results;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('PII analysis failed', {
        error: errorMessage,
        correlationId: request.correlation_id,
        analyzerUrl: this.analyzerUrl
      });
      throw new Error(`PII analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Anonymize Text Based on Analysis Results
   * 
   * Applies anonymization operators to detected PII entities in text.
   * 
   * @param request - Anonymization configuration
   * @returns Anonymized text and operation details
   */
  async anonymizeText(request: AnonymizationRequest): Promise<AnonymizationResult> {
    try {
      logger.info('Starting text anonymization', {
        textLength: request.text.length,
        entitiesCount: request.analyzer_results.length,
        operatorTypes: Object.keys(request.anonymizers)
      });

      const response = await this.anonymizerClient.post('/anonymize', {
        text: request.text,
        anonymizers: request.anonymizers,
        analyzer_results: request.analyzer_results,
        conflict_resolution: request.conflict_resolution || 'merge_similar_or_contained'
      });

      const result: AnonymizationResult = response.data;
      
      logger.info('Text anonymization completed', {
        originalLength: request.text.length,
        anonymizedLength: result.text.length,
        operationsApplied: result.items.length
      });

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Text anonymization failed', {
        error: errorMessage,
        anonymizerUrl: this.anonymizerUrl
      });
      throw new Error(`Text anonymization failed: ${errorMessage}`);
    }
  }

  /**
   * Get Available Recognizers
   * 
   * Retrieves list of available PII recognizers by language.
   * 
   * @param language - Language code (default: 'en')
   * @returns Array of available recognizer names
   */
  async getAvailableRecognizers(language: string = 'en'): Promise<string[]> {
    try {
      const response = await this.analyzerClient.get('/recognizers', {
        params: { language }
      });
      
      logger.debug('Retrieved available recognizers', {
        language,
        count: response.data.length
      });
      
      return response.data;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get available recognizers', {
        error: errorMessage,
        language
      });
      throw new Error(`Failed to get recognizers: ${errorMessage}`);
    }
  }

  /**
   * Get Supported Entity Types
   * 
   * Retrieves list of PII entity types that Presidio can detect.
   * 
   * @param language - Language code (default: 'en')
   * @returns Array of supported entity type names
   */
  async getSupportedEntities(language: string = 'en'): Promise<string[]> {
    try {
      const response = await this.analyzerClient.get('/supportedentities', {
        params: { language }
      });
      
      logger.debug('Retrieved supported entities', {
        language,
        count: response.data.length
      });
      
      return response.data;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get supported entities', {
        error: errorMessage,
        language
      });
      throw new Error(`Failed to get supported entities: ${errorMessage}`);
    }
  }

  /**
   * Health Check
   * 
   * Verifies that both Analyzer and Anonymizer services are healthy.
   * 
   * @returns Health status of both services
   */
  async healthCheck(): Promise<{ analyzer: boolean; anonymizer: boolean }> {
    const results = { analyzer: false, anonymizer: false };
    
    try {
      await this.analyzerClient.get('/health');
      results.analyzer = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Analyzer health check failed', { error: errorMessage });
    }
    
    try {
      await this.anonymizerClient.get('/health');
      results.anonymizer = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Anonymizer health check failed', { error: errorMessage });
    }
    
    logger.info('Presidio health check completed', results);
    return results;
  }

  /**
   * Create Default Anonymizers
   * 
   * Generates a standard set of anonymization operators for common PII types.
   * This provides sensible defaults for typical use cases.
   * 
   * @returns Default anonymizer configuration
   */
  createDefaultAnonymizers(): Record<string, AnonymizerOperator> {
    return {
      // Personal Information
      'PERSON': { type: 'replace', new_value: '[PERSON]' },
      'EMAIL_ADDRESS': { type: 'replace', new_value: '[EMAIL]' },
      'PHONE_NUMBER': { type: 'replace', new_value: '[PHONE]' },
      
      // Government IDs
      'US_SSN': { type: 'replace', new_value: '[SSN]' },
      'US_DRIVER_LICENSE': { type: 'replace', new_value: '[DRIVER_LICENSE]' },
      'US_PASSPORT': { type: 'replace', new_value: '[PASSPORT]' },
      
      // Financial Information
      'CREDIT_CARD': { type: 'mask', masking_char: '*', chars_to_mask: 12, from_end: false },
      'IBAN_CODE': { type: 'replace', new_value: '[BANK_ACCOUNT]' },
      'US_BANK_NUMBER': { type: 'replace', new_value: '[BANK_ACCOUNT]' },
      
      // Location Information
      'LOCATION': { type: 'replace', new_value: '[LOCATION]' },
      'IP_ADDRESS': { type: 'replace', new_value: '[IP_ADDRESS]' },
      
      // Dates and Times
      'DATE_TIME': { type: 'replace', new_value: '[DATE]' },
      
      // Organization Information
      'ORGANIZATION': { type: 'replace', new_value: '[ORGANIZATION]' },
      
      // Medical Information
      'MEDICAL_LICENSE': { type: 'replace', new_value: '[MEDICAL_LICENSE]' },
      'UK_NHS': { type: 'replace', new_value: '[NHS_NUMBER]' },
      
      // Cryptocurrency
      'CRYPTO': { type: 'replace', new_value: '[CRYPTO_ADDRESS]' },
      
      // Generic fallback
      'DEFAULT': { type: 'redact' }
    };
  }

  /**
   * Setup HTTP Interceptors
   * 
   * Configures request and response interceptors for logging and error handling.
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    const requestInterceptor = (config: any) => {
      logger.debug('Presidio API request', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL
      });
      return config;
    };

    // Response interceptor for error handling
    const responseErrorInterceptor = (error: any) => {
      logger.error('Presidio API error', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return Promise.reject(error);
    };

    // Apply interceptors to both clients
    this.analyzerClient.interceptors.request.use(requestInterceptor);
    this.analyzerClient.interceptors.response.use(null, responseErrorInterceptor);
    
    this.anonymizerClient.interceptors.request.use(requestInterceptor);
    this.anonymizerClient.interceptors.response.use(null, responseErrorInterceptor);
  }
}

// Export singleton instance
export const presidioService = new PresidioService();