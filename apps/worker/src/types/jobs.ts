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
  entityType: string;
  text: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
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