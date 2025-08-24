import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import FormData from 'form-data';
import pdfParse from 'pdf-parse';
import { logger } from '../utils/logger.js';
import { tesseractService, OCRExtractionResult } from './tesseract.service.js';

/**
 * Text Extraction Service
 * 
 * Comprehensive service for extracting text content from various file types.
 * Integrates with Apache Tika for document processing and handles fallbacks
 * for different file formats.
 * 
 * Supported formats:
 * - Plain text files (TXT, CSV, JSONL)
 * - Documents (PDF, DOCX, XLSX, PPTX, ODT)
 * - Web formats (HTML, XML, RTF)
 * - Images (JPEG, PNG, TIFF, BMP) - via OCR when available
 * - Archives (ZIP, TAR) - extracts text from contained files
 */
export class TextExtractionService {
  private tikaUrl: string;
  private tesseractUrl: string;
  private maxFileSize: number;
  private maxTextLength: number;

  constructor() {
    this.tikaUrl = process.env.TIKA_URL || 'http://localhost:9998';
    this.tesseractUrl = process.env.TESSERACT_URL || 'http://localhost:8884';
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.maxTextLength = 10 * 1024 * 1024; // 10MB of text content
  }

  /**
   * Extract Text Content from File
   * 
   * Main entry point for text extraction. Automatically detects the best
   * extraction method based on file type and content.
   * 
   * @param filePath - Absolute path to the file
   * @param fileType - File type identifier (optional, will detect if not provided)
   * @param mimeType - MIME type (optional, for additional context)
   * @returns Extracted text content with metadata
   */
  async extractText(
    filePath: string, 
    fileType?: string, 
    mimeType?: string
  ): Promise<TextExtractionResult> {
    try {
      logger.info('Starting text extraction', {
        filePath: path.basename(filePath),
        fileType,
        mimeType
      });

      // Validate file exists and size
      await this.validateFile(filePath);

      // Detect file type if not provided
      const detectedType = fileType || this.detectFileType(filePath);
      
      // Choose extraction strategy
      const strategy = this.getExtractionStrategy(detectedType, mimeType);
      
      logger.info('Using extraction strategy', {
        filePath: path.basename(filePath),
        detectedType,
        strategy
      });

      // Extract text using appropriate method
      let result: TextExtractionResult;
      
      switch (strategy) {
        case 'direct':
          result = await this.extractDirectText(filePath);
          break;
        case 'pdf':
          result = await this.extractViaPDF(filePath);
          break;
        case 'tika':
          result = await this.extractViaTika(filePath);
          break;
        case 'ocr':
          result = await this.extractViaOCR(filePath);
          break;
        case 'hybrid':
          result = await this.extractViaHybrid(filePath);
          break;
        default:
          throw new Error(`Unknown extraction strategy: ${strategy}`);
      }

      // Post-process extracted text
      result = await this.postProcessText(result);

      logger.info('Text extraction completed', {
        filePath: path.basename(filePath),
        strategy,
        textLength: result.text.length,
        confidence: result.confidence,
        metadata: Object.keys(result.metadata)
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Text extraction failed', {
        filePath: path.basename(filePath),
        fileType,
        error: errorMessage
      });

      // Return minimal result with error information
      return {
        text: '',
        confidence: 0,
        extractionMethod: 'failed',
        metadata: {
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate File for Extraction
   * 
   * Checks if file exists, is readable, and within size limits.
   * 
   * @param filePath - Path to the file
   */
  private async validateFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }
      
      if (stats.size > this.maxFileSize) {
        throw new Error(`File size (${stats.size} bytes) exceeds maximum allowed (${this.maxFileSize} bytes)`);
      }
      
      // Check file accessibility
      await fs.access(filePath, fs.constants.R_OK);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Detect File Type from Extension
   * 
   * @param filePath - Path to the file
   * @returns Detected file type
   */
  private detectFileType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase().replace('.', '');
    
    const typeMap: Record<string, string> = {
      'txt': 'TXT',
      'csv': 'CSV',
      'json': 'JSON',
      'jsonl': 'JSONL',
      'pdf': 'PDF',
      'doc': 'DOC',
      'docx': 'DOCX',
      'xls': 'XLS',
      'xlsx': 'XLSX',
      'ppt': 'PPT',
      'pptx': 'PPTX',
      'odt': 'ODT',
      'ods': 'ODS',
      'odp': 'ODP',
      'rtf': 'RTF',
      'html': 'HTML',
      'htm': 'HTML',
      'xml': 'XML',
      'jpg': 'JPEG',
      'jpeg': 'JPEG',
      'png': 'PNG',
      'tiff': 'TIFF',
      'tif': 'TIFF',
      'bmp': 'BMP',
      'gif': 'GIF'
    };

    return typeMap[extension] || 'UNKNOWN';
  }

  /**
   * Get Extraction Strategy
   * 
   * Determines the best extraction approach based on file type.
   * 
   * @param fileType - File type
   * @param mimeType - MIME type (optional)
   * @returns Extraction strategy
   */
  private getExtractionStrategy(fileType: string, mimeType?: string): ExtractionStrategy {
    // Text files - direct reading
    const textTypes = ['TXT', 'CSV', 'JSON', 'JSONL', 'HTML', 'XML'];
    if (textTypes.includes(fileType)) {
      return 'direct';
    }

    // PDFs - use direct PDF extraction for better coordinate mapping
    if (fileType === 'PDF') {
      return 'pdf';
    }
    
    // Other documents - use Tika
    const documentTypes = ['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'ODT', 'ODS', 'ODP', 'RTF'];
    if (documentTypes.includes(fileType)) {
      return 'tika';
    }

    // Images - OCR (fallback to Tika if OCR unavailable)
    const imageTypes = ['JPEG', 'PNG', 'TIFF', 'BMP', 'GIF'];
    if (imageTypes.includes(fileType)) {
      return 'ocr'; // Will fallback to Tika if OCR service unavailable
    }

    // For MIME type hints
    if (mimeType) {
      if (mimeType.startsWith('text/')) {
        return 'direct';
      }
      if (mimeType.startsWith('image/')) {
        return 'ocr';
      }
      if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('office')) {
        return 'tika';
      }
    }

    // Default to Tika for unknown types
    return 'tika';
  }

  /**
   * Extract Text Directly from Text Files
   * 
   * @param filePath - Path to text file
   * @returns Extraction result
   */
  private async extractDirectText(filePath: string): Promise<TextExtractionResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        text: content,
        confidence: 1.0,
        extractionMethod: 'direct',
        metadata: {
          originalLength: content.length,
          encoding: 'utf-8',
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      // Try with different encodings
      try {
        const buffer = await fs.readFile(filePath);
        const content = buffer.toString('latin1');
        
        return {
          text: content,
          confidence: 0.8,
          extractionMethod: 'direct',
          metadata: {
            originalLength: content.length,
            encoding: 'latin1',
            timestamp: new Date().toISOString(),
            fallbackEncoding: true
          }
        };
      } catch (fallbackError) {
        throw new Error(`Failed to read text file with any encoding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Extract Text via Apache Tika
   * 
   * @param filePath - Path to file
   * @returns Extraction result
   */
  private async extractViaTika(filePath: string): Promise<TextExtractionResult> {
    try {
      // Check Tika service availability
      await this.checkTikaHealth();

      // Read file as binary data
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      
      // Detect MIME type from file extension
      const mimeType = this.getMimeTypeFromPath(filePath);

      // Send PUT request to Tika with raw binary data (correct Tika API usage)
      const response = await axios.put(`${this.tikaUrl}/tika`, fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Accept': 'text/plain'
        },
        timeout: 60000, // 60 second timeout for large files
        maxContentLength: this.maxTextLength
      });

      const extractedText = response.data;

      // Get additional metadata if available
      let metadata: any = {
        timestamp: new Date().toISOString(),
        tikaVersion: await this.getTikaVersion(),
        originalFileName: fileName,
        detectedMimeType: mimeType
      };

      try {
        // Try to get document metadata using PUT method with correct headers
        const metadataResponse = await axios.put(`${this.tikaUrl}/meta`, fileBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        metadata.documentMetadata = metadataResponse.data;
      } catch (metaError) {
        // Metadata extraction failed, but that's OK
        logger.warn('Could not extract document metadata', {
          fileName,
          error: metaError instanceof Error ? metaError.message : 'Unknown error'
        });
      }

      return {
        text: extractedText || '',
        confidence: 0.9,
        extractionMethod: 'tika',
        metadata
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Tika extraction failed', {
        filePath: path.basename(filePath),
        error: errorMessage
      });
      
      // Fallback to direct text if possible
      if (this.isProbablyTextFile(filePath)) {
        logger.info('Falling back to direct text extraction');
        return await this.extractDirectText(filePath);
      }
      
      throw new Error(`Tika extraction failed: ${errorMessage}`);
    }
  }

  /**
   * Extract Text via OCR (Tesseract)
   * 
   * Uses the dedicated TesseractService for enhanced OCR processing with
   * confidence scoring, quality metrics, and low-confidence warnings.
   * 
   * @param filePath - Path to image file
   * @returns Extraction result
   */
  private async extractViaOCR(filePath: string): Promise<TextExtractionResult> {
    try {
      // Check if OCR service is available
      const ocrAvailable = await tesseractService.healthCheck();
      
      if (!ocrAvailable) {
        logger.warn('OCR service unavailable, falling back to Tika');
        return await this.extractViaTika(filePath);
      }

      // Validate image format support
      if (!tesseractService.isSupportedImageFormat(filePath)) {
        logger.warn('Unsupported image format for OCR, falling back to Tika', {
          filePath: path.basename(filePath),
          supportedFormats: tesseractService.getSupportedFormats()
        });
        return await this.extractViaTika(filePath);
      }

      logger.info('Starting enhanced OCR extraction', {
        filePath: path.basename(filePath),
        tesseractUrl: this.tesseractUrl
      });

      // Use the enhanced Tesseract service
      const ocrResult: OCRExtractionResult = await tesseractService.extractTextFromImage(
        filePath,
        {
          language: 'eng',
          minConfidence: 60 // As requested - 60% confidence threshold
        }
      );

      // Convert OCR result to TextExtractionResult format
      const result: TextExtractionResult = {
        text: ocrResult.text,
        confidence: ocrResult.confidence / 100, // Convert percentage to decimal
        extractionMethod: 'ocr',
        metadata: {
          // Core OCR metadata
          originalLength: ocrResult.text.length,
          wordCount: ocrResult.wordCount,
          language: ocrResult.language,
          processingTimeMs: ocrResult.processingTimeMs,
          extractedAt: ocrResult.extractedAt.toISOString(),
          
          // Quality metrics from OCR
          ocrConfidence: ocrResult.confidence,
          imageFormat: ocrResult.metadata.imageFormat,
          wordsDetected: ocrResult.metadata.wordsDetected,
          averageWordConfidence: ocrResult.metadata.averageWordConfidence,
          lowConfidenceWords: ocrResult.metadata.lowConfidenceWords,
          
          // Quality indicators
          qualityWarnings: ocrResult.confidence < 60 ? ['Low OCR confidence'] : [],
          hasLowConfidenceWords: ocrResult.metadata.lowConfidenceWords > 0,
          
          // Service info
          ocrVersion: 'tesseract-server-enhanced'
        }
      };

      // Post-process the extracted text
      const processedResult = await this.postProcessText(result);
      
      // Check text quality - if very poor, fallback to Tika
      if (!processedResult.text || processedResult.text.trim().length < 5) {
        logger.warn('OCR produced very little text, falling back to Tika', {
          textLength: processedResult.text?.length || 0,
          confidence: ocrResult.confidence
        });
        return await this.extractViaTika(filePath);
      }

      // Log quality warnings for monitoring
      if (ocrResult.confidence < 60) {
        logger.warn('OCR extraction completed with low confidence - results may need review', {
          filePath: path.basename(filePath),
          confidence: ocrResult.confidence,
          textLength: processedResult.text.length,
          wordsDetected: ocrResult.metadata.wordsDetected,
          lowConfidenceWords: ocrResult.metadata.lowConfidenceWords
        });
      }

      logger.info('Enhanced OCR extraction completed successfully', {
        filePath: path.basename(filePath),
        textLength: processedResult.text.length,
        confidence: ocrResult.confidence,
        wordsDetected: ocrResult.metadata.wordsDetected,
        processingTimeMs: ocrResult.processingTimeMs,
        qualityLevel: ocrResult.confidence >= 80 ? 'high' : ocrResult.confidence >= 60 ? 'medium' : 'low'
      });

      return processedResult;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Enhanced OCR extraction failed', {
        filePath: path.basename(filePath),
        error: errorMessage,
        tesseractUrl: this.tesseractUrl
      });
      
      // Fallback to Tika for document-style processing
      try {
        logger.info('Falling back to Tika for image processing');
        return await this.extractViaTika(filePath);
      } catch (tikaError) {
        throw new Error(`Both OCR and Tika extraction failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Extract Text via PDF Parser
   * 
   * Uses pdf-parse library to extract text directly from PDF files.
   * This provides better text positioning information compared to Tika
   * for coordinate-based redaction in PDF anonymization.
   */
  private async extractViaPDF(filePath: string): Promise<TextExtractionResult> {
    try {
      logger.info('Starting PDF text extraction', {
        filePath: path.basename(filePath)
      });

      // Read PDF file
      const pdfBuffer = await fs.readFile(filePath);
      
      // Parse PDF and extract text
      const pdfData = await pdfParse(pdfBuffer);
      
      logger.info('PDF text extraction completed', {
        filePath: path.basename(filePath),
        textLength: pdfData.text.length,
        pageCount: pdfData.numpages,
        metadata: pdfData.metadata ? 'present' : 'absent'
      });

      // Calculate confidence based on text extraction success
      const confidence = pdfData.text.length > 0 ? 0.9 : 0.1;
      
      return {
        text: pdfData.text,
        confidence,
        extractionMethod: 'pdf',
        metadata: {
          pageCount: pdfData.numpages,
          info: pdfData.info || {},
          metadata: pdfData.metadata || {},
          version: pdfData.version,
          textLength: pdfData.text.length,
          extractionLibrary: 'pdf-parse'
        },
        warnings: []
      };

    } catch (error) {
      logger.error('PDF text extraction failed', {
        filePath: path.basename(filePath),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to Tika extraction if PDF parsing fails
      logger.info('Falling back to Tika extraction for PDF', {
        filePath: path.basename(filePath)
      });
      
      try {
        const tikaResult = await this.extractViaTika(filePath);
        return {
          ...tikaResult,
          extractionMethod: 'pdf-fallback-tika',
          warnings: ['PDF direct extraction failed, used Tika fallback']
        };
      } catch (tikaError) {
        throw new Error(`PDF extraction failed with both methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Extract Text via Hybrid Method
   * 
   * Uses multiple extraction methods and combines results.
   * 
   * @param filePath - Path to file
   * @returns Extraction result
   */
  private async extractViaHybrid(filePath: string): Promise<TextExtractionResult> {
    try {
      // Try Tika first
      const tikaResult = await this.extractViaTika(filePath);
      
      // If Tika succeeds and produces good results, use it
      if (tikaResult.text.length > 50 && tikaResult.confidence >= 0.8) {
        return tikaResult;
      }
      
      // Try OCR if Tika didn't produce good results
      const ocrResult = await this.extractViaOCR(filePath);
      
      // Compare results and choose the best one
      if (ocrResult.text.length > tikaResult.text.length) {
        return {
          ...ocrResult,
          extractionMethod: 'hybrid',
          metadata: {
            ...ocrResult.metadata,
            tikaAttempted: true,
            primaryMethod: 'ocr'
          }
        };
      }
      
      return {
        ...tikaResult,
        extractionMethod: 'hybrid',
        metadata: {
          ...tikaResult.metadata,
          ocrAttempted: true,
          primaryMethod: 'tika'
        }
      };
      
    } catch (error) {
      throw new Error(`Hybrid extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Post-process Extracted Text
   * 
   * Cleans and normalizes extracted text content.
   * 
   * @param result - Raw extraction result
   * @returns Processed extraction result
   */
  private async postProcessText(result: TextExtractionResult): Promise<TextExtractionResult> {
    let text = result.text;
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove control characters except newlines and tabs
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove excessive newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Truncate if too long
    if (text.length > this.maxTextLength) {
      logger.warn('Text content truncated due to length', {
        originalLength: text.length,
        maxLength: this.maxTextLength
      });
      
      text = text.substring(0, this.maxTextLength) + '\n[TRUNCATED]';
      result.metadata.truncated = true;
      result.metadata.originalLength = result.text.length;
    }
    
    // Calculate text quality metrics
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const avgWordLength = wordCount > 0 ? text.replace(/\s/g, '').length / wordCount : 0;
    const alphaRatio = text.replace(/[^a-zA-Z]/g, '').length / Math.max(text.length, 1);
    
    return {
      ...result,
      text,
      metadata: {
        ...result.metadata,
        processedLength: text.length,
        wordCount,
        avgWordLength: Math.round(avgWordLength * 10) / 10,
        alphaRatio: Math.round(alphaRatio * 100) / 100,
        postProcessed: true
      }
    };
  }

  /**
   * Check if File is Probably Text
   * 
   * @param filePath - Path to file
   * @returns True if file appears to be text
   */
  private isProbablyTextFile(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    const textExtensions = ['.txt', '.csv', '.json', '.jsonl', '.html', '.xml', '.htm'];
    return textExtensions.includes(extension);
  }

  /**
   * Check Tika Service Health
   * 
   * @returns True if Tika is available
   */
  private async checkTikaHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.tikaUrl}/version`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.warn('Tika service health check failed', {
        tikaUrl: this.tikaUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check OCR Service Health
   * 
   * Uses the enhanced TesseractService health check for better reliability.
   * 
   * @returns True if OCR service is available
   */
  private async checkOCRHealth(): Promise<boolean> {
    return await tesseractService.healthCheck();
  }

  /**
   * Get MIME Type from File Path
   * 
   * @param filePath - Path to file
   * @returns MIME type string
   */
  private getMimeTypeFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Image types
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.bmp': 'image/bmp',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      
      // Document types
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text types
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.xml': 'application/xml',
      '.rtf': 'application/rtf',
      
      // Archive types
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get MIME Type from File Extension (legacy method)
   * 
   * @param filePath - Path to file
   * @returns MIME type string
   */
  private getMimeTypeFromExtension(filePath: string): string {
    return this.getMimeTypeFromPath(filePath);
  }

  /**
   * Get Tika Version
   * 
   * @returns Tika version string
   */
  private async getTikaVersion(): Promise<string> {
    try {
      const response = await axios.get(`${this.tikaUrl}/version`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      return 'unknown';
    }
  }
}

/**
 * Text Extraction Result Interface
 * 
 * Enhanced to support OCR confidence metadata and quality indicators
 */
export interface TextExtractionResult {
  text: string;
  confidence: number;
  extractionMethod: string;
  metadata: Record<string, any> & {
    // OCR-specific metadata (optional)
    ocrConfidence?: number;
    imageFormat?: string;
    wordsDetected?: number;
    averageWordConfidence?: number;
    lowConfidenceWords?: number;
    qualityWarnings?: string[];
    hasLowConfidenceWords?: boolean;
    processingTimeMs?: number;
  };
}

/**
 * Extraction Strategy Types
 */
export type ExtractionStrategy = 'direct' | 'pdf' | 'tika' | 'ocr' | 'hybrid';

// Export singleton instance
export const textExtractionService = new TextExtractionService();