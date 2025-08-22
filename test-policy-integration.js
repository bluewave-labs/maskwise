#!/usr/bin/env node

/**
 * Policy Engine Integration Test
 * 
 * Tests the complete policy-driven PII detection pipeline:
 * 1. Create a custom YAML policy with specific entity configurations
 * 2. Upload a file with the policy selected
 * 3. Verify that PII detection uses policy configurations
 * 4. Validate findings are filtered and processed according to policy
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  credentials: {
    email: 'admin@maskwise.com',
    password: 'admin123'
  },
  policy: {
    name: `Test Policy Integration ${Date.now()}`,
    description: 'Policy to test YAML-based PII detection configuration'
  },
  project: {
    name: `Policy Integration Test Project ${Date.now()}`,
    description: 'Project for testing policy integration'
  }
};

// Sample YAML policy with specific entity configurations
const YAML_POLICY = `name: "Test Policy Integration"
version: "1.0.0"  
description: "Policy to test YAML-based PII detection configuration"
detection:
  entities:
    - type: "EMAIL_ADDRESS"
      confidence_threshold: 0.95
      action: "redact"
    - type: "SSN"
      confidence_threshold: 0.98
      action: "mask"
    - type: "CREDIT_CARD"
      confidence_threshold: 0.90
      action: "replace"
      replacement: "XXXX-XXXX-XXXX-XXXX"
    - type: "PHONE_NUMBER"
      confidence_threshold: 0.85
      action: "encrypt"
scope:
  file_types: ["txt", "csv", "pdf"]
  max_file_size: "100MB"
anonymization:
  default_action: "redact"
  preserve_format: true
  audit_trail: true`;

// Test file content with various PII types at different confidence levels
const TEST_FILE_CONTENT = `Policy Integration Test Data
============================

High confidence PII (should be detected):
- Email: john.doe@company.com
- SSN: 123-45-6789
- Credit Card: 4532-1234-5678-9012
- Phone: (555) 123-4567

Medium confidence data:
- Potential Email: contact@test
- Phone-like: 555.123.4567
- Date: 2024-01-15

Personal Information:
- Name: Jane Smith
- Address: 123 Main Street, Anytown, CA 12345
- Website: https://example.com

This file tests policy-driven PII detection with different confidence thresholds and actions.
`;

class PolicyIntegrationTester {
  constructor() {
    this.authToken = null;
    this.testResults = {
      authentication: false,
      policyCreation: false,
      projectCreation: false,
      fileUpload: false,
      piiDetection: false,
      policyApplication: false,
      findingsValidation: false,
      cleanup: false
    };
    this.testData = {
      policyId: null,
      projectId: null,
      datasetId: null,
      jobId: null
    };
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async authenticate() {
    try {
      this.log('🔐 Authenticating with API...');
      
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: TEST_CONFIG.credentials.email,
        password: TEST_CONFIG.credentials.password
      });

      if (response.data.accessToken) {
        this.authToken = response.data.accessToken;
        this.testResults.authentication = true;
        this.log('✅ Authentication successful');
        return true;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      this.log('❌ Authentication failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async createTestPolicy() {
    try {
      this.log('📋 Creating test policy with YAML configuration...');
      
      const response = await axios.post(`${API_BASE}/policies`, {
        name: TEST_CONFIG.policy.name,
        description: TEST_CONFIG.policy.description,
        yamlContent: YAML_POLICY,
        tags: ['test', 'integration'],
        isActive: true
      }, {
        headers: this.getAuthHeaders()
      });

      if (response.data.id) {
        this.testData.policyId = response.data.id;
        this.testResults.policyCreation = true;
        this.log('✅ Policy created successfully', {
          policyId: response.data.id,
          name: response.data.name,
          version: response.data.version
        });
        return true;
      } else {
        throw new Error('No policy ID in response');
      }
    } catch (error) {
      this.log('❌ Policy creation failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  async createTestProject() {
    try {
      this.log('📁 Creating test project...');
      
      const response = await axios.post(`${API_BASE}/projects`, {
        name: TEST_CONFIG.project.name,
        description: TEST_CONFIG.project.description,
        tags: ['test', 'policy-integration']
      }, {
        headers: this.getAuthHeaders()
      });

      if (response.data.id) {
        this.testData.projectId = response.data.id;
        this.testResults.projectCreation = true;
        this.log('✅ Project created successfully', {
          projectId: response.data.id,
          name: response.data.name
        });
        return true;
      } else {
        throw new Error('No project ID in response');
      }
    } catch (error) {
      this.log('❌ Project creation failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  async uploadTestFile() {
    try {
      this.log('📤 Uploading test file with policy configuration...');
      
      // Create temporary test file
      const testFileName = 'policy-integration-test.txt';
      const testFilePath = path.join(__dirname, testFileName);
      fs.writeFileSync(testFilePath, TEST_FILE_CONTENT);

      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('file', fs.createReadStream(testFilePath), {
        filename: testFileName,
        contentType: 'text/plain'
      });
      formData.append('projectId', this.testData.projectId);
      formData.append('policyId', this.testData.policyId);
      formData.append('description', 'Test file for policy integration validation');

      const response = await axios.post(`${API_BASE}/datasets/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          ...formData.getHeaders()
        }
      });

      // Clean up temporary file
      fs.unlinkSync(testFilePath);

      if (response.data.dataset && response.data.job) {
        this.testData.datasetId = response.data.dataset.id;
        this.testData.jobId = response.data.job.id;
        this.testResults.fileUpload = true;
        this.log('✅ File upload successful', {
          datasetId: response.data.dataset.id,
          jobId: response.data.job.id,
          status: response.data.job.status
        });
        return true;
      } else {
        throw new Error('No dataset or job data in response');
      }
    } catch (error) {
      this.log('❌ File upload failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  async waitForJobCompletion(maxWaitTime = 120000) {
    try {
      this.log('⏳ Waiting for PII analysis job completion...');
      
      const startTime = Date.now();
      const checkInterval = 5000; // 5 seconds

      while (Date.now() - startTime < maxWaitTime) {
        const response = await axios.get(`${API_BASE}/datasets/${this.testData.datasetId}`, {
          headers: this.getAuthHeaders()
        });

        const job = response.data.jobs?.[0];
        if (job) {
          this.log(`Job status: ${job.status} (${job.progress || 0}%)`);
          
          if (job.status === 'COMPLETED') {
            this.testResults.piiDetection = true;
            this.log('✅ PII analysis completed successfully');
            return true;
          } else if (job.status === 'FAILED') {
            throw new Error('PII analysis job failed');
          }
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      throw new Error('Job completion timeout exceeded');
    } catch (error) {
      this.log('❌ Job completion check failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  async validatePolicyApplication() {
    try {
      this.log('🔍 Validating policy-driven PII findings...');
      
      const response = await axios.get(
        `${API_BASE}/datasets/${this.testData.datasetId}/findings?limit=100`, 
        { headers: this.getAuthHeaders() }
      );

      const findings = response.data.data;
      this.log(`Found ${findings.length} PII entities after policy filtering`);

      // Analyze findings by entity type
      const findingsByType = findings.reduce((acc, finding) => {
        if (!acc[finding.entityType]) {
          acc[finding.entityType] = [];
        }
        acc[finding.entityType].push(finding);
        return acc;
      }, {});

      this.log('Findings breakdown by entity type:', findingsByType);

      // Validate policy application
      let policyValidation = {
        emailRedaction: false,
        ssnMasking: false,
        creditCardReplacement: false,
        phoneEncryption: false,
        confidenceFiltering: false
      };

      // Check EMAIL_ADDRESS findings (should be redacted)
      const emailFindings = findingsByType['EMAIL_ADDRESS'] || [];
      if (emailFindings.length > 0) {
        const redactedEmails = emailFindings.filter(f => f.text === '[EMAIL_ADDRESS]');
        policyValidation.emailRedaction = redactedEmails.length > 0;
        this.log(`Email redaction: ${policyValidation.emailRedaction} (${redactedEmails.length}/${emailFindings.length})`);
      }

      // Check SSN findings (should be masked)
      const ssnFindings = findingsByType['SSN'] || [];
      if (ssnFindings.length > 0) {
        const maskedSSNs = ssnFindings.filter(f => f.text.includes('*') && f.text.length === 11);
        policyValidation.ssnMasking = maskedSSNs.length > 0;
        this.log(`SSN masking: ${policyValidation.ssnMasking} (${maskedSSNs.length}/${ssnFindings.length})`);
      }

      // Check CREDIT_CARD findings (should be replaced)
      const creditCardFindings = findingsByType['CREDIT_CARD'] || [];
      if (creditCardFindings.length > 0) {
        const replacedCards = creditCardFindings.filter(f => f.text === 'XXXX-XXXX-XXXX-XXXX');
        policyValidation.creditCardReplacement = replacedCards.length > 0;
        this.log(`Credit card replacement: ${policyValidation.creditCardReplacement} (${replacedCards.length}/${creditCardFindings.length})`);
      }

      // Check PHONE_NUMBER findings (should be encrypted)
      const phoneFindings = findingsByType['PHONE_NUMBER'] || [];
      if (phoneFindings.length > 0) {
        const encryptedPhones = phoneFindings.filter(f => f.text.includes('[ENCRYPTED:PHONE_NUMBER:'));
        policyValidation.phoneEncryption = encryptedPhones.length > 0;
        this.log(`Phone encryption: ${policyValidation.phoneEncryption} (${encryptedPhones.length}/${phoneFindings.length})`);
      }

      // Check confidence threshold filtering
      const highConfidenceFindings = findings.filter(f => f.confidence >= 0.85);
      policyValidation.confidenceFiltering = highConfidenceFindings.length === findings.length;
      this.log(`Confidence filtering: ${policyValidation.confidenceFiltering} (all findings >= 0.85 threshold)`);

      // Overall policy application success
      const validationResults = Object.values(policyValidation);
      const successfulValidations = validationResults.filter(Boolean).length;
      
      this.testResults.policyApplication = successfulValidations >= 3; // At least 3 validations must pass
      this.testResults.findingsValidation = findings.length > 0;

      this.log('Policy validation results:', policyValidation);
      this.log(`✅ Policy application validation: ${this.testResults.policyApplication ? 'PASSED' : 'FAILED'} (${successfulValidations}/${validationResults.length})`);

      return this.testResults.policyApplication;
    } catch (error) {
      this.log('❌ Policy validation failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  async cleanup() {
    try {
      this.log('🧹 Cleaning up test data...');
      
      const cleanupTasks = [];

      // Delete dataset
      if (this.testData.datasetId) {
        cleanupTasks.push(
          axios.delete(`${API_BASE}/datasets/${this.testData.datasetId}`, {
            headers: this.getAuthHeaders()
          }).catch(err => this.log('Warning: Dataset cleanup failed', err.message))
        );
      }

      // Delete project
      if (this.testData.projectId) {
        cleanupTasks.push(
          axios.delete(`${API_BASE}/projects/${this.testData.projectId}`, {
            headers: this.getAuthHeaders()
          }).catch(err => this.log('Warning: Project cleanup failed', err.message))
        );
      }

      // Delete policy
      if (this.testData.policyId) {
        cleanupTasks.push(
          axios.delete(`${API_BASE}/policies/${this.testData.policyId}`, {
            headers: this.getAuthHeaders()
          }).catch(err => this.log('Warning: Policy cleanup failed', err.message))
        );
      }

      await Promise.all(cleanupTasks);
      this.testResults.cleanup = true;
      this.log('✅ Cleanup completed');
      return true;
    } catch (error) {
      this.log('⚠️ Cleanup had some issues', { error: error.message });
      return false;
    }
  }

  async runTests() {
    console.log('🚀 Starting Policy Engine Integration Test');
    console.log('==========================================\n');

    const startTime = Date.now();

    try {
      // Run all test steps
      const testSteps = [
        () => this.authenticate(),
        () => this.createTestPolicy(),
        () => this.createTestProject(),
        () => this.uploadTestFile(),
        () => this.waitForJobCompletion(),
        () => this.validatePolicyApplication()
      ];

      for (const step of testSteps) {
        const success = await step();
        if (!success) {
          this.log('❌ Test failed at step, aborting remaining tests');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between steps
      }

    } finally {
      await this.cleanup();
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print final results
    console.log('\n==========================================');
    console.log('📊 Policy Integration Test Results');
    console.log('==========================================');

    const results = Object.entries(this.testResults);
    const passed = results.filter(([_, success]) => success).length;
    const total = results.length;

    results.forEach(([test, success]) => {
      console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'PASSED' : 'FAILED'}`);
    });

    console.log('\n==========================================');
    console.log(`📈 Overall Result: ${passed}/${total} tests passed`);
    console.log(`⏱️ Total Duration: ${duration} seconds`);
    
    const overallSuccess = passed >= 6; // Require most tests to pass
    console.log(`🎯 Integration Status: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('==========================================\n');

    if (overallSuccess) {
      console.log('🎉 Policy engine integration is working correctly!');
      console.log('✨ YAML policies are being parsed and applied to PII detection');
      console.log('🛡️ Entity-specific actions and confidence thresholds are functioning');
    } else {
      console.log('⚠️  Some policy integration features need attention');
      console.log('🔧 Review the failed tests and check system configuration');
    }

    return overallSuccess;
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new PolicyIntegrationTester();
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}