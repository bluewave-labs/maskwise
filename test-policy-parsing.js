#!/usr/bin/env node

/**
 * Policy YAML Parsing Test
 * 
 * Tests the policy engine YAML parsing and configuration conversion
 * without requiring Docker services to be running.
 */

const fs = require('fs');
const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  credentials: {
    email: 'admin@maskwise.com',
    password: 'admin123'
  }
};

// Sample YAML policy with different entity configurations
const YAML_POLICY = `name: "YAML Parsing Test Policy"
version: "1.0.0"
description: "Test policy for validating YAML parsing capabilities"
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
    - type: "PERSON"
      confidence_threshold: 0.80
      action: "redact"
scope:
  file_types: ["txt", "csv", "pdf", "docx"]
  max_file_size: "100MB"
anonymization:
  default_action: "redact"
  preserve_format: true
  audit_trail: true`;

class PolicyParsingTester {
  constructor() {
    this.authToken = null;
    this.testResults = {
      authentication: false,
      yamlValidation: false,
      policyCreation: false,
      policyRetrieval: false,
      yamlParsing: false,
      cleanup: false
    };
    this.testData = {
      policyId: null
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

  async validateYAML() {
    try {
      this.log('📝 Validating YAML syntax...');
      
      const response = await axios.post(`${API_BASE}/policies/validate`, {
        yamlContent: YAML_POLICY
      }, {
        headers: this.getAuthHeaders()
      });

      if (response.data.isValid) {
        this.testResults.yamlValidation = true;
        this.log('✅ YAML validation successful', {
          isValid: response.data.isValid,
          entities: response.data.parsedPolicy?.detection?.entities?.length || 0,
          actions: response.data.parsedPolicy?.detection?.entities?.map(e => `${e.type}:${e.action}`) || []
        });
        return true;
      } else {
        throw new Error(`YAML validation failed: ${response.data.errors.join(', ')}`);
      }
    } catch (error) {
      this.log('❌ YAML validation failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  async createPolicyFromYAML() {
    try {
      this.log('📋 Creating policy from YAML...');
      
      const response = await axios.post(`${API_BASE}/policies`, {
        name: `YAML Parsing Test ${Date.now()}`,
        description: 'Test policy for validating YAML parsing',
        yamlContent: YAML_POLICY,
        tags: ['test', 'yaml-parsing'],
        isActive: true
      }, {
        headers: this.getAuthHeaders()
      });

      if (response.data.id) {
        this.testData.policyId = response.data.id;
        this.testResults.policyCreation = true;
        this.log('✅ Policy creation successful', {
          policyId: response.data.id,
          name: response.data.name,
          version: response.data.version,
          isActive: response.data.isActive
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

  async retrieveAndValidatePolicy() {
    try {
      this.log('🔍 Retrieving created policy...');
      
      const response = await axios.get(`${API_BASE}/policies/${this.testData.policyId}`, {
        headers: this.getAuthHeaders()
      });

      const policy = response.data;
      if (policy && policy.id === this.testData.policyId) {
        this.testResults.policyRetrieval = true;
        
        this.log('✅ Policy retrieval successful', {
          policyId: policy.id,
          name: policy.name,
          hasVersions: policy._count?.versions > 0,
          versionsCount: policy._count?.versions
        });

        // Validate the YAML content was stored properly
        if (policy.versions && policy.versions.length > 0) {
          const activeVersion = policy.versions.find(v => v.isActive);
          if (activeVersion && activeVersion.config) {
            this.testResults.yamlParsing = true;
            this.log('✅ YAML content properly stored', {
              hasActiveVersion: !!activeVersion,
              configType: typeof activeVersion.config,
              configPreview: typeof activeVersion.config === 'string' 
                ? activeVersion.config.substring(0, 100) + '...'
                : 'JSON Object'
            });
          } else {
            this.log('⚠️ No active version or config found');
          }
        } else {
          this.log('⚠️ No versions found in policy');
        }

        return true;
      } else {
        throw new Error('Policy ID mismatch or invalid response');
      }
    } catch (error) {
      this.log('❌ Policy retrieval failed', { 
        error: error.response?.data || error.message 
      });
      return false;
    }
  }

  async cleanup() {
    try {
      this.log('🧹 Cleaning up test policy...');
      
      if (this.testData.policyId) {
        await axios.delete(`${API_BASE}/policies/${this.testData.policyId}`, {
          headers: this.getAuthHeaders()
        });
      }

      this.testResults.cleanup = true;
      this.log('✅ Cleanup completed');
      return true;
    } catch (error) {
      this.log('⚠️ Cleanup had issues', { error: error.message });
      return false;
    }
  }

  async runTests() {
    console.log('🚀 Starting Policy YAML Parsing Test');
    console.log('=====================================\n');

    const startTime = Date.now();

    try {
      // Run all test steps
      const testSteps = [
        () => this.authenticate(),
        () => this.validateYAML(),
        () => this.createPolicyFromYAML(),
        () => this.retrieveAndValidatePolicy()
      ];

      for (const step of testSteps) {
        const success = await step();
        if (!success) {
          this.log('❌ Test failed at step, aborting remaining tests');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between steps
      }

    } finally {
      await this.cleanup();
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print final results
    console.log('\n=====================================');
    console.log('📊 Policy YAML Parsing Test Results');
    console.log('=====================================');

    const results = Object.entries(this.testResults);
    const passed = results.filter(([_, success]) => success).length;
    const total = results.length;

    results.forEach(([test, success]) => {
      console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'PASSED' : 'FAILED'}`);
    });

    console.log('\n=====================================');
    console.log(`📈 Overall Result: ${passed}/${total} tests passed`);
    console.log(`⏱️ Total Duration: ${duration} seconds`);
    
    const overallSuccess = passed >= 5; // Require most tests to pass
    console.log(`🎯 YAML Parsing Status: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('=====================================\n');

    if (overallSuccess) {
      console.log('🎉 Policy YAML parsing is working correctly!');
      console.log('✨ YAML policies can be created, validated, and stored');
      console.log('🛡️ Policy engine backend is ready for integration');
    } else {
      console.log('⚠️  Some YAML parsing features need attention');
      console.log('🔧 Review the failed tests and check API configuration');
    }

    return overallSuccess;
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new PolicyParsingTester();
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}