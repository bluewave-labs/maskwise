import { Test, TestingModule } from '@nestjs/testing';
import { SystemService } from '../system.service';
import { UpdateSystemConfigDto } from '../dto/update-system-config.dto';

describe('SystemService', () => {
  let service: SystemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemService],
    }).compile();

    service = module.get<SystemService>(SystemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfiguration', () => {
    it('should return the default system configuration', async () => {
      const config = await service.getConfiguration();

      expect(config).toHaveProperty('file');
      expect(config).toHaveProperty('pii');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('performance');

      // Verify default file configuration
      expect(config.file.maxSize).toBe(100);
      expect(config.file.allowedTypes).toContain('txt');
      expect(config.file.allowedTypes).toContain('pdf');
      expect(config.file.retentionDays).toBe(30);

      // Verify default PII configuration
      expect(config.pii.defaultConfidenceThreshold).toBe(0.85);
      expect(config.pii.defaultAction).toBe('redact');
      expect(config.pii.enabledEntityTypes).toContain('EMAIL_ADDRESS');
      expect(config.pii.enabledEntityTypes).toContain('SSN');

      // Verify default security configuration
      expect(config.security.enableFileContentScanning).toBe(true);
      expect(config.security.maxConcurrentJobs).toBe(10);
      expect(config.security.jobTimeoutMinutes).toBe(30);

      // Verify default performance configuration
      expect(config.performance.workerConcurrency).toBe(5);
      expect(config.performance.maxQueueSize).toBe(1000);
      expect(config.performance.enableCaching).toBe(true);
    });

    it('should return a copy of the configuration (not reference)', async () => {
      const config1 = await service.getConfiguration();
      const config2 = await service.getConfiguration();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object references
    });
  });

  describe('updateConfiguration', () => {
    describe('File Configuration Updates', () => {
      it('should update file max size successfully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          file: { maxSize: 200 }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.file.maxSize).toBe(200);
        
        // Verify the change persists
        const config = await service.getConfiguration();
        expect(config.file.maxSize).toBe(200);
      });

      it('should validate file max size range', async () => {
        const invalidSizes = [0, -5, 1001, 2000];

        for (const size of invalidSizes) {
          const updateDto: UpdateSystemConfigDto = {
            file: { maxSize: size }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow('File size must be between 1MB and 1000MB');
        }
      });

      it('should update allowed file types successfully', async () => {
        const newTypes = ['txt', 'pdf', 'png'];
        const updateDto: UpdateSystemConfigDto = {
          file: { allowedTypes: newTypes }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.file.allowedTypes).toEqual(newTypes);
        expect(result.file.allowedTypes).toContain('txt');
        expect(result.file.allowedTypes).toContain('pdf');
        expect(result.file.allowedTypes).toContain('png');
      });

      it('should validate file types against allowed list', async () => {
        const invalidTypes = ['exe', 'bat', 'invalid'];
        const updateDto: UpdateSystemConfigDto = {
          file: { allowedTypes: ['txt', ...invalidTypes] }
        };

        await expect(service.updateConfiguration(updateDto))
          .rejects.toThrow('Invalid file types: exe, bat, invalid');
      });

      it('should update retention days successfully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          file: { retentionDays: 90 }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.file.retentionDays).toBe(90);
      });

      it('should validate retention days range', async () => {
        const invalidDays = [0, -10, 366, 500];

        for (const days of invalidDays) {
          const updateDto: UpdateSystemConfigDto = {
            file: { retentionDays: days }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow('Retention days must be between 1 and 365');
        }
      });
    });

    describe('PII Configuration Updates', () => {
      it('should update confidence threshold successfully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          pii: { defaultConfidenceThreshold: 0.9 }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.pii.defaultConfidenceThreshold).toBe(0.9);
      });

      it('should validate confidence threshold range', async () => {
        const invalidThresholds = [-0.1, 1.1, 2.0, -1.0];

        for (const threshold of invalidThresholds) {
          const updateDto: UpdateSystemConfigDto = {
            pii: { defaultConfidenceThreshold: threshold }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow('Confidence threshold must be between 0 and 1');
        }
      });

      it('should accept valid confidence threshold boundary values', async () => {
        const validThresholds = [0, 0.5, 1];

        for (const threshold of validThresholds) {
          const updateDto: UpdateSystemConfigDto = {
            pii: { defaultConfidenceThreshold: threshold }
          };

          const result = await service.updateConfiguration(updateDto);
          expect(result.pii.defaultConfidenceThreshold).toBe(threshold);
        }
      });

      it('should update default action successfully', async () => {
        const actions = ['redact', 'mask', 'replace', 'encrypt'];

        for (const action of actions) {
          const updateDto: UpdateSystemConfigDto = {
            pii: { defaultAction: action as any }
          };

          const result = await service.updateConfiguration(updateDto);
          expect(result.pii.defaultAction).toBe(action);
        }
      });

      it('should validate default action against allowed values', async () => {
        const invalidActions = ['delete', 'remove', 'hide', 'invalid'];

        for (const action of invalidActions) {
          const updateDto: UpdateSystemConfigDto = {
            pii: { defaultAction: action as any }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow(`Invalid action: ${action}`);
        }
      });

      it('should update enabled entity types successfully', async () => {
        const entityTypes = ['EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD'];
        const updateDto: UpdateSystemConfigDto = {
          pii: { enabledEntityTypes: entityTypes }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.pii.enabledEntityTypes).toEqual(entityTypes);
        expect(result.pii.enabledEntityTypes).toContain('EMAIL_ADDRESS');
        expect(result.pii.enabledEntityTypes).toContain('SSN');
        expect(result.pii.enabledEntityTypes).toContain('CREDIT_CARD');
      });

      it('should validate entity types against allowed list', async () => {
        const invalidEntityTypes = ['INVALID_TYPE', 'FAKE_ENTITY'];
        const updateDto: UpdateSystemConfigDto = {
          pii: { enabledEntityTypes: ['EMAIL_ADDRESS', ...invalidEntityTypes] }
        };

        await expect(service.updateConfiguration(updateDto))
          .rejects.toThrow('Invalid entity types: INVALID_TYPE, FAKE_ENTITY');
      });

      it('should accept all valid entity types', async () => {
        const validEntityTypes = [
          'EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD', 'PHONE_NUMBER', 'PERSON',
          'LOCATION', 'ORGANIZATION', 'DATE_TIME', 'IP_ADDRESS', 'URL',
          'US_DRIVER_LICENSE', 'US_PASSPORT', 'MEDICAL_LICENSE', 'IBAN', 'UK_NHS'
        ];

        const updateDto: UpdateSystemConfigDto = {
          pii: { enabledEntityTypes: validEntityTypes }
        };

        const result = await service.updateConfiguration(updateDto);
        expect(result.pii.enabledEntityTypes).toEqual(validEntityTypes);
      });
    });

    describe('Security Configuration Updates', () => {
      it('should update max concurrent jobs successfully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          security: { maxConcurrentJobs: 25 }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.security.maxConcurrentJobs).toBe(25);
      });

      it('should validate max concurrent jobs range', async () => {
        const invalidValues = [0, -5, 51, 100];

        for (const value of invalidValues) {
          const updateDto: UpdateSystemConfigDto = {
            security: { maxConcurrentJobs: value }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow('Max concurrent jobs must be between 1 and 50');
        }
      });

      it('should update job timeout successfully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          security: { jobTimeoutMinutes: 60 }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.security.jobTimeoutMinutes).toBe(60);
      });

      it('should validate job timeout range', async () => {
        const invalidValues = [4, 0, 121, 200];

        for (const value of invalidValues) {
          const updateDto: UpdateSystemConfigDto = {
            security: { jobTimeoutMinutes: value }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow('Job timeout must be between 5 and 120 minutes');
        }
      });

      it('should update file content scanning flag', async () => {
        const updateDto: UpdateSystemConfigDto = {
          security: { enableFileContentScanning: false }
        };

        let result = await service.updateConfiguration(updateDto);
        expect(result.security.enableFileContentScanning).toBe(false);

        // Test toggling back
        const updateDto2: UpdateSystemConfigDto = {
          security: { enableFileContentScanning: true }
        };

        result = await service.updateConfiguration(updateDto2);
        expect(result.security.enableFileContentScanning).toBe(true);
      });
    });

    describe('Performance Configuration Updates', () => {
      it('should update worker concurrency successfully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          performance: { workerConcurrency: 10 }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.performance.workerConcurrency).toBe(10);
      });

      it('should validate worker concurrency range', async () => {
        const invalidValues = [0, -3, 21, 50];

        for (const value of invalidValues) {
          const updateDto: UpdateSystemConfigDto = {
            performance: { workerConcurrency: value }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow('Worker concurrency must be between 1 and 20');
        }
      });

      it('should update max queue size successfully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          performance: { maxQueueSize: 5000 }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.performance.maxQueueSize).toBe(5000);
      });

      it('should validate max queue size range', async () => {
        const invalidValues = [99, 0, 10001, 50000];

        for (const value of invalidValues) {
          const updateDto: UpdateSystemConfigDto = {
            performance: { maxQueueSize: value }
          };

          await expect(service.updateConfiguration(updateDto))
            .rejects.toThrow('Max queue size must be between 100 and 10000');
        }
      });

      it('should update caching flag', async () => {
        const updateDto: UpdateSystemConfigDto = {
          performance: { enableCaching: false }
        };

        let result = await service.updateConfiguration(updateDto);
        expect(result.performance.enableCaching).toBe(false);

        // Test toggling back
        const updateDto2: UpdateSystemConfigDto = {
          performance: { enableCaching: true }
        };

        result = await service.updateConfiguration(updateDto2);
        expect(result.performance.enableCaching).toBe(true);
      });
    });

    describe('Combined Configuration Updates', () => {
      it('should update multiple sections simultaneously', async () => {
        const updateDto: UpdateSystemConfigDto = {
          file: {
            maxSize: 150,
            retentionDays: 60
          },
          pii: {
            defaultConfidenceThreshold: 0.9,
            defaultAction: 'mask'
          },
          security: {
            maxConcurrentJobs: 20,
            enableFileContentScanning: false
          },
          performance: {
            workerConcurrency: 8,
            enableCaching: false
          }
        };

        const result = await service.updateConfiguration(updateDto);

        // Verify all updates were applied
        expect(result.file.maxSize).toBe(150);
        expect(result.file.retentionDays).toBe(60);
        expect(result.pii.defaultConfidenceThreshold).toBe(0.9);
        expect(result.pii.defaultAction).toBe('mask');
        expect(result.security.maxConcurrentJobs).toBe(20);
        expect(result.security.enableFileContentScanning).toBe(false);
        expect(result.performance.workerConcurrency).toBe(8);
        expect(result.performance.enableCaching).toBe(false);

        // Verify unchanged values remain the same
        expect(result.file.allowedTypes).toEqual(expect.arrayContaining(['txt', 'csv', 'pdf']));
        expect(result.security.jobTimeoutMinutes).toBe(30); // Default value
      });

      it('should handle partial updates without affecting other sections', async () => {
        // First, get the initial configuration
        const initialConfig = await service.getConfiguration();

        // Update only PII section
        const updateDto: UpdateSystemConfigDto = {
          pii: { defaultConfidenceThreshold: 0.95 }
        };

        const result = await service.updateConfiguration(updateDto);

        // Verify PII update was applied
        expect(result.pii.defaultConfidenceThreshold).toBe(0.95);

        // Verify other sections remain unchanged
        expect(result.file).toEqual(initialConfig.file);
        expect(result.security).toEqual(initialConfig.security);
        expect(result.performance).toEqual(initialConfig.performance);

        // Verify other PII properties remain unchanged
        expect(result.pii.defaultAction).toBe(initialConfig.pii.defaultAction);
        expect(result.pii.enabledEntityTypes).toEqual(initialConfig.pii.enabledEntityTypes);
      });

      it('should validate individual sections independently', async () => {
        const updateDto: UpdateSystemConfigDto = {
          file: { maxSize: 150 }, // Valid
          pii: { defaultConfidenceThreshold: 1.5 }, // Invalid
          security: { maxConcurrentJobs: 15 } // Valid
        };

        await expect(service.updateConfiguration(updateDto))
          .rejects.toThrow('Confidence threshold must be between 0 and 1');

        // Verify no partial updates were applied
        const config = await service.getConfiguration();
        expect(config.file.maxSize).toBe(100); // Should remain default
        expect(config.security.maxConcurrentJobs).toBe(10); // Should remain default
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle empty update object', async () => {
        const updateDto: UpdateSystemConfigDto = {};

        const result = await service.updateConfiguration(updateDto);

        // Should return current configuration unchanged
        const currentConfig = await service.getConfiguration();
        expect(result).toEqual(currentConfig);
      });

      it('should handle null and undefined values gracefully', async () => {
        const updateDto: UpdateSystemConfigDto = {
          file: {},
          pii: {},
          security: {},
          performance: {}
        };

        const result = await service.updateConfiguration(updateDto);

        // Should return current configuration unchanged
        expect(result.file.maxSize).toBe(100); // Default value
        expect(result.pii.defaultConfidenceThreshold).toBe(0.85); // Default value
      });

      it('should handle boundary values correctly', async () => {
        const updateDto: UpdateSystemConfigDto = {
          file: { 
            maxSize: 1,           // Minimum valid
            retentionDays: 365    // Maximum valid
          },
          pii: { 
            defaultConfidenceThreshold: 0.0  // Minimum valid
          },
          security: { 
            maxConcurrentJobs: 50,    // Maximum valid
            jobTimeoutMinutes: 5      // Minimum valid
          },
          performance: {
            workerConcurrency: 1,     // Minimum valid
            maxQueueSize: 10000       // Maximum valid
          }
        };

        const result = await service.updateConfiguration(updateDto);

        expect(result.file.maxSize).toBe(1);
        expect(result.file.retentionDays).toBe(365);
        expect(result.pii.defaultConfidenceThreshold).toBe(0.0);
        expect(result.security.maxConcurrentJobs).toBe(50);
        expect(result.security.jobTimeoutMinutes).toBe(5);
        expect(result.performance.workerConcurrency).toBe(1);
        expect(result.performance.maxQueueSize).toBe(10000);
      });
    });
  });

  describe('Service State Management', () => {
    it('should maintain state between method calls', async () => {
      // Update configuration
      const updateDto: UpdateSystemConfigDto = {
        file: { maxSize: 250 }
      };

      await service.updateConfiguration(updateDto);

      // Get configuration should return updated value
      const config = await service.getConfiguration();
      expect(config.file.maxSize).toBe(250);

      // Make another update
      const updateDto2: UpdateSystemConfigDto = {
        pii: { defaultConfidenceThreshold: 0.75 }
      };

      await service.updateConfiguration(updateDto2);

      // Both changes should be present
      const finalConfig = await service.getConfiguration();
      expect(finalConfig.file.maxSize).toBe(250);
      expect(finalConfig.pii.defaultConfidenceThreshold).toBe(0.75);
    });

    it('should handle concurrent updates safely', async () => {
      const updates = [
        { file: { maxSize: 200 } },
        { pii: { defaultAction: 'mask' } },
        { security: { maxConcurrentJobs: 30 } },
        { performance: { workerConcurrency: 10 } }
      ];

      // Run updates concurrently
      const results = await Promise.all(
        updates.map(update => service.updateConfiguration(update))
      );

      // All updates should have been applied
      expect(results[0].file.maxSize).toBe(200);
      expect(results[1].pii.defaultAction).toBe('mask');
      expect(results[2].security.maxConcurrentJobs).toBe(30);
      expect(results[3].performance.workerConcurrency).toBe(10);

      // Final configuration should have all changes
      const finalConfig = await service.getConfiguration();
      expect(finalConfig.file.maxSize).toBe(200);
      expect(finalConfig.pii.defaultAction).toBe('mask');
      expect(finalConfig.security.maxConcurrentJobs).toBe(30);
      expect(finalConfig.performance.workerConcurrency).toBe(10);
    });
  });
});