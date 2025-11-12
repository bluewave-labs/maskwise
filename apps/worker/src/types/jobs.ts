export interface BaseJobData {
  jobId: string;
  userId: string;
  projectId?: string;
  datasetId?: string;
}

export interface FileProcessingJobData extends BaseJobData {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  policyId?: string;
}

export interface TextExtractionJobData extends BaseJobData {
  filePath: string;
  fileName: string;
  mimeType: string;
  extractionMethod: 'tika' | 'ocr' | 'direct';
}

export interface PIIAnalysisJobData extends BaseJobData {
  text: string;
  fileName: string;
  filePath?: string;
  policyId?: string;
  confidence?: number;
}

export interface AnonymizationJobData extends BaseJobData {
  policyId: string;
  findingsData: PIIFinding[];
  sourceFilePath: string;
  outputType?: string;
}

export interface PIIFinding {
  id?: string;
  entityType: string;
  text: string;
  startOffset: number;
  endOffset: number;
  start?: number; // Alias for startOffset (used in some contexts)
  end?: number; // Alias for endOffset (used in some contexts)
  confidence: number;
  lineNumber?: number;
  columnNumber?: number;
  columnName?: string;
  context?: string;
  contextBefore?: string;
  contextAfter?: string;
  action?: 'redact' | 'mask' | 'replace' | 'encrypt';
  replacement?: string;
  datasetId?: string;
  createdAt?: Date;
}

export type JobData = 
  | FileProcessingJobData
  | TextExtractionJobData
  | PIIAnalysisJobData
  | AnonymizationJobData;

export enum JobType {
  EXTRACT_TEXT = 'EXTRACT_TEXT',
  ANALYZE_PII = 'ANALYZE_PII', 
  ANONYMIZE = 'ANONYMIZE',
  ANONYMIZATION = 'anonymization',
  GENERATE_REPORT = 'GENERATE_REPORT',
  FILE_PROCESSING = 'file-processing',
  PII_ANALYSIS = 'pii-analysis'
}

export enum JobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}