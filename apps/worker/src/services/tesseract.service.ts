import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config } from '../config';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import FormData from 'form-data';

// Tesseract OCR response interfaces
interface TesseractOCRResponse {
  data: {
    exit: {
      code: number;
      signal: null | string;
    };
    stderr: string;
    stdout: string;
  };
}

interface TesseractHealthResponse {
  status: string;
  version?: string;
}

export interface OCRExtractionResult {
  text: string;
  confidence: number;
  wordCount: number;
  language: string;
  extractedAt: Date;
  processingTimeMs: number;
  metadata: {
    imageFormat: string;
    wordsDetected: number;
    averageWordConfidence: number;
    lowConfidenceWords: number;
  };
}

export class TesseractService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly defaultLanguage = 'eng'; // English
  private readonly minConfidenceThreshold = 60; // 60% as requested

  constructor() {
    this.baseUrl = Config.extraction.tesseractUrl;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // 60 second timeout for OCR processing
      headers: {
        'User-Agent': 'Maskwise-Worker/1.0',
      },
    });

    logger.info('TesseractService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Estimate OCR confidence based on text quality indicators
   * Since hertzg/tesseract-server doesn't provide confidence scores,
   * we estimate based on text characteristics and Tesseract warnings
   */
  private estimateConfidence(text: string, stderr: string): number {
    let confidence = 85; // Start with a reasonable baseline
    
    // Check for Tesseract warnings that indicate lower quality
    if (stderr.includes('Invalid resolution')) {
      confidence -= 5;
    }
    if (stderr.includes('Warning')) {
      confidence -= 3;
    }
    if (stderr.includes('Error')) {
      confidence -= 15;
    }
    
    // Text quality indicators
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const totalChars = text.length;
    
    // Check for garbled text indicators
    const specialCharCount = (text.match(/[^a-zA-Z0-9\s\-()@.,]/g) || []).length;
    const specialCharRatio = specialCharCount / totalChars;
    
    if (specialCharRatio > 0.2) confidence -= 10; // Too many special chars
    if (wordCount < 3) confidence -= 10; // Very short text
    if (totalChars < 10) confidence -= 15; // Very short content
    
    // Bonus for structured content (emails, phones, etc.)
    if (text.match(/@/)) confidence += 5; // Has email
    if (text.match(/\d{3}-\d{3}-\d{4}/)) confidence += 5; // Has phone pattern
    if (text.match(/\d{3}-\d{2}-\d{4}/)) confidence += 5; // Has SSN pattern
    
    // Ensure confidence stays within bounds
    return Math.max(60, Math.min(95, confidence));
  }

  /**
   * Check if Tesseract service is healthy and available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try the root endpoint to check if server is responding
      const response = await this.client.get('/');
      const isHealthy = response.status === 200;
      
      logger.info('Tesseract health check completed', {
        healthy: isHealthy,
        status: response.status,
      });
      
      return isHealthy;
    } catch (error) {
      logger.error('Tesseract health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        baseUrl: this.baseUrl,
      });
      return false;
    }
  }

  /**
   * Extract text from image file using OCR
   */
  async extractTextFromImage(
    imagePath: string,
    options: {
      language?: string;
      minConfidence?: number;
    } = {}
  ): Promise<OCRExtractionResult> {
    const startTime = Date.now();
    const language = options.language || this.defaultLanguage;
    const minConfidence = options.minConfidence || this.minConfidenceThreshold;

    try {
      logger.info('Starting OCR text extraction', {
        imagePath,
        language,
        minConfidence,
      });

      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Get file stats for metadata
      const stats = fs.statSync(imagePath);
      const fileExtension = imagePath.split('.').pop()?.toLowerCase() || 'unknown';

      // Validate image format
      const supportedFormats = ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'gif'];
      if (!supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported image format: ${fileExtension}. Supported: ${supportedFormats.join(', ')}`);
      }

      // Create form data for file upload with correct hertzg/tesseract-server format
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      formData.append('options', JSON.stringify({
        languages: [language],
      }));

      // Send OCR request to correct endpoint
      const response = await this.client.post<TesseractOCRResponse>('/tesseract', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const ocrResult = response.data;
      const processingTime = Date.now() - startTime;

      // Check if OCR processing was successful
      if (ocrResult.data.exit.code !== 0) {
        throw new Error(`OCR processing failed with exit code ${ocrResult.data.exit.code}: ${ocrResult.data.stderr}`);
      }

      // Extract text from stdout
      const extractedText = ocrResult.data.stdout.trim();
      
      if (!extractedText) {
        throw new Error('No text extracted from image');
      }

      // Count actual words in extracted text
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
      
      // Since hertzg/tesseract-server doesn't provide word-level confidence scores,
      // we'll estimate confidence based on text quality indicators
      const wordsDetected = wordCount;
      const averageWordConfidence = this.estimateConfidence(extractedText, ocrResult.data.stderr);
      const lowConfidenceWords = averageWordConfidence < minConfidence ? Math.floor(wordCount * 0.3) : 0;

      const result: OCRExtractionResult = {
        text: extractedText,
        confidence: averageWordConfidence / 100, // Convert to 0-1 scale
        wordCount,
        language,
        extractedAt: new Date(),
        processingTimeMs: processingTime,
        metadata: {
          imageFormat: fileExtension.toUpperCase(),
          wordsDetected,
          averageWordConfidence,
          lowConfidenceWords,
        },
      };

      logger.info('OCR text extraction completed', {
        imagePath,
        confidence: result.confidence,
        wordCount,
        processingTimeMs: processingTime,
        textLength: extractedText.length,
        wordsDetected,
        lowConfidenceWords,
      });

      // Log warning for low confidence results
      if (averageWordConfidence < minConfidence) {
        logger.warn('OCR extraction completed with low confidence', {
          imagePath,
          confidence: averageWordConfidence,
          minConfidence,
          recommendation: 'Consider manual review of results',
        });
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof AxiosError) {
        logger.error('OCR extraction failed - HTTP error', {
          imagePath,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          processingTimeMs: processingTime,
        });
        throw new Error(`OCR extraction failed: ${error.response?.status} ${error.response?.statusText}`);
      } else {
        logger.error('OCR extraction failed - Unexpected error', {
          imagePath,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: processingTime,
        });
        throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Validate if a file is a supported image format
   */
  isSupportedImageFormat(filePath: string): boolean {
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    const supportedFormats = ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'gif'];
    return supportedFormats.includes(fileExtension || '');
  }

  /**
   * Get supported image formats
   */
  getSupportedFormats(): string[] {
    return ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'gif'];
  }

  /**
   * Get OCR service configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultLanguage: this.defaultLanguage,
      minConfidenceThreshold: this.minConfidenceThreshold,
      supportedFormats: this.getSupportedFormats(),
    };
  }
}

// Export singleton instance
export const tesseractService = new TesseractService();