import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';

export interface SSEJobUpdate {
  jobId: string;
  status: string;
  userId: string;
  progress?: number;
  message?: string;
}

export interface SSEDatasetUpdate {
  datasetId: string;
  status: string;
  userId: string;
  findingsCount?: number;
}

export interface SSENotification {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * SSE Client Service for Worker
 * 
 * Sends real-time updates from the worker service to the API's SSE service
 * This allows the frontend to receive real-time job status updates
 */
export class SSEClientService {
  private apiClient: AxiosInstance;
  private baseURL: string;
  private isEnabled: boolean = false;

  constructor() {
    this.baseURL = process.env.API_URL || 'http://localhost:3001';
    this.isEnabled = process.env.ENABLE_SSE_UPDATES !== 'false';
    
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Maskwise-Worker/1.0'
      }
    });

    // Add request interceptor for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug('SSE Client Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => {
        logger.error('SSE Client Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.debug('SSE Client Response:', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.warn('SSE Client Response Error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send job status update to SSE service
   */
  async sendJobUpdate(update: SSEJobUpdate): Promise<void> {
    if (!this.isEnabled) {
      logger.debug('SSE updates disabled, skipping job update:', update);
      return;
    }

    try {
      await this.apiClient.post('/sse/job-update', update);
      logger.debug('Job update sent successfully:', { 
        jobId: update.jobId, 
        status: update.status 
      });
    } catch (error: any) {
      logger.warn('Failed to send job update:', {
        jobId: update.jobId,
        status: update.status,
        error: error.message,
        // Don't fail the job if SSE update fails
        suppressError: true
      });
    }
  }

  /**
   * Send dataset status update to SSE service
   */
  async sendDatasetUpdate(update: SSEDatasetUpdate): Promise<void> {
    if (!this.isEnabled) {
      logger.debug('SSE updates disabled, skipping dataset update:', update);
      return;
    }

    try {
      await this.apiClient.post('/sse/dataset-update', update);
      logger.debug('Dataset update sent successfully:', { 
        datasetId: update.datasetId, 
        status: update.status 
      });
    } catch (error: any) {
      logger.warn('Failed to send dataset update:', {
        datasetId: update.datasetId,
        status: update.status,
        error: error.message,
        suppressError: true
      });
    }
  }

  /**
   * Send notification to SSE service
   */
  async sendNotification(notification: SSENotification): Promise<void> {
    if (!this.isEnabled) {
      logger.debug('SSE updates disabled, skipping notification:', notification);
      return;
    }

    try {
      await this.apiClient.post('/sse/notification', notification);
      logger.debug('Notification sent successfully:', { 
        userId: notification.userId, 
        title: notification.title 
      });
    } catch (error: any) {
      logger.warn('Failed to send notification:', {
        userId: notification.userId,
        title: notification.title,
        error: error.message,
        suppressError: true
      });
    }
  }

  /**
   * Check if SSE service is available
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const response = await this.apiClient.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.warn('SSE service health check failed:', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get SSE service status
   */
  getStatus(): { enabled: boolean; baseURL: string } {
    return {
      enabled: this.isEnabled,
      baseURL: this.baseURL
    };
  }

  /**
   * Enable or disable SSE updates
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info('SSE updates', { enabled: this.isEnabled });
  }
}

// Export singleton instance
export const sseClientService = new SSEClientService();