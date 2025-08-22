import { Injectable } from '@nestjs/common';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SystemConfigResponseDto } from './dto/system-config-response.dto';

@Injectable()
export class SystemService {
  // In a real implementation, this would be stored in database or configuration service
  private systemConfig: SystemConfigResponseDto = {
    file: {
      maxSize: 100, // 100MB
      allowedTypes: ['txt', 'csv', 'pdf', 'docx', 'xlsx', 'json', 'jsonl'],
      retentionDays: 30,
    },
    pii: {
      defaultConfidenceThreshold: 0.85,
      defaultAction: 'redact',
      enabledEntityTypes: [
        'EMAIL_ADDRESS',
        'SSN', 
        'CREDIT_CARD',
        'PHONE_NUMBER',
        'PERSON',
        'LOCATION',
        'ORGANIZATION',
        'DATE_TIME',
        'IP_ADDRESS',
        'URL'
      ],
    },
    security: {
      enableFileContentScanning: true,
      maxConcurrentJobs: 10,
      jobTimeoutMinutes: 30,
    },
    performance: {
      workerConcurrency: 5,
      maxQueueSize: 1000,
      enableCaching: true,
    },
  };

  async getConfiguration(): Promise<SystemConfigResponseDto> {
    return { ...this.systemConfig };
  }

  async updateConfiguration(updateConfigDto: UpdateSystemConfigDto): Promise<SystemConfigResponseDto> {
    // Validate and merge the configuration
    if (updateConfigDto.file) {
      // Validate file configuration
      if (updateConfigDto.file.maxSize) {
        if (updateConfigDto.file.maxSize < 1 || updateConfigDto.file.maxSize > 1000) {
          throw new Error('File size must be between 1MB and 1000MB');
        }
        this.systemConfig.file.maxSize = updateConfigDto.file.maxSize;
      }
      
      if (updateConfigDto.file.allowedTypes) {
        // Validate file types
        const validTypes = ['txt', 'csv', 'pdf', 'docx', 'xlsx', 'json', 'jsonl', 'pptx', 'png', 'jpg', 'tiff'];
        const invalidTypes = updateConfigDto.file.allowedTypes.filter(type => !validTypes.includes(type));
        if (invalidTypes.length > 0) {
          throw new Error(`Invalid file types: ${invalidTypes.join(', ')}`);
        }
        this.systemConfig.file.allowedTypes = updateConfigDto.file.allowedTypes;
      }
      
      if (updateConfigDto.file.retentionDays) {
        if (updateConfigDto.file.retentionDays < 1 || updateConfigDto.file.retentionDays > 365) {
          throw new Error('Retention days must be between 1 and 365');
        }
        this.systemConfig.file.retentionDays = updateConfigDto.file.retentionDays;
      }
    }

    if (updateConfigDto.pii) {
      // Validate PII configuration
      if (updateConfigDto.pii.defaultConfidenceThreshold !== undefined) {
        if (updateConfigDto.pii.defaultConfidenceThreshold < 0 || updateConfigDto.pii.defaultConfidenceThreshold > 1) {
          throw new Error('Confidence threshold must be between 0 and 1');
        }
        this.systemConfig.pii.defaultConfidenceThreshold = updateConfigDto.pii.defaultConfidenceThreshold;
      }
      
      if (updateConfigDto.pii.defaultAction) {
        const validActions = ['redact', 'mask', 'replace', 'encrypt'];
        if (!validActions.includes(updateConfigDto.pii.defaultAction)) {
          throw new Error(`Invalid action: ${updateConfigDto.pii.defaultAction}`);
        }
        this.systemConfig.pii.defaultAction = updateConfigDto.pii.defaultAction;
      }
      
      if (updateConfigDto.pii.enabledEntityTypes) {
        const validEntityTypes = [
          'EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD', 'PHONE_NUMBER', 'PERSON',
          'LOCATION', 'ORGANIZATION', 'DATE_TIME', 'IP_ADDRESS', 'URL',
          'US_DRIVER_LICENSE', 'US_PASSPORT', 'MEDICAL_LICENSE', 'IBAN', 'UK_NHS'
        ];
        const invalidTypes = updateConfigDto.pii.enabledEntityTypes.filter(type => !validEntityTypes.includes(type));
        if (invalidTypes.length > 0) {
          throw new Error(`Invalid entity types: ${invalidTypes.join(', ')}`);
        }
        this.systemConfig.pii.enabledEntityTypes = updateConfigDto.pii.enabledEntityTypes;
      }
    }

    if (updateConfigDto.security) {
      // Validate security configuration
      if (updateConfigDto.security.maxConcurrentJobs) {
        if (updateConfigDto.security.maxConcurrentJobs < 1 || updateConfigDto.security.maxConcurrentJobs > 50) {
          throw new Error('Max concurrent jobs must be between 1 and 50');
        }
        this.systemConfig.security.maxConcurrentJobs = updateConfigDto.security.maxConcurrentJobs;
      }
      
      if (updateConfigDto.security.jobTimeoutMinutes) {
        if (updateConfigDto.security.jobTimeoutMinutes < 5 || updateConfigDto.security.jobTimeoutMinutes > 120) {
          throw new Error('Job timeout must be between 5 and 120 minutes');
        }
        this.systemConfig.security.jobTimeoutMinutes = updateConfigDto.security.jobTimeoutMinutes;
      }
      
      if (updateConfigDto.security.enableFileContentScanning !== undefined) {
        this.systemConfig.security.enableFileContentScanning = updateConfigDto.security.enableFileContentScanning;
      }
    }

    if (updateConfigDto.performance) {
      // Validate performance configuration
      if (updateConfigDto.performance.workerConcurrency) {
        if (updateConfigDto.performance.workerConcurrency < 1 || updateConfigDto.performance.workerConcurrency > 20) {
          throw new Error('Worker concurrency must be between 1 and 20');
        }
        this.systemConfig.performance.workerConcurrency = updateConfigDto.performance.workerConcurrency;
      }
      
      if (updateConfigDto.performance.maxQueueSize) {
        if (updateConfigDto.performance.maxQueueSize < 100 || updateConfigDto.performance.maxQueueSize > 10000) {
          throw new Error('Max queue size must be between 100 and 10000');
        }
        this.systemConfig.performance.maxQueueSize = updateConfigDto.performance.maxQueueSize;
      }
      
      if (updateConfigDto.performance.enableCaching !== undefined) {
        this.systemConfig.performance.enableCaching = updateConfigDto.performance.enableCaching;
      }
    }

    // In a real implementation, save to database here
    // await this.configRepository.save(this.systemConfig);

    return { ...this.systemConfig };
  }
}