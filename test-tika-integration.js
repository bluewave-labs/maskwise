#!/usr/bin/env node

/**
 * Apache Tika Integration Test
 * 
 * Focused test to validate Tika service integration for document processing.
 * Tests direct connection to Tika service and text extraction capabilities.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const TIKA_URL = 'http://localhost:9998';

class TikaIntegrationTester {
  constructor() {
    this.testResults = {
      tikaHealth: false,
      versionCheck: false,
      textExtraction: false,
      metadataExtraction: false
    };
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async checkTikaHealth() {
    try {
      this.log('🔍 Checking Tika service health...');
      
      const response = await axios.get(`${TIKA_URL}/version`, { timeout: 5000 });
      
      if (response.status === 200) {
        this.testResults.tikaHealth = true;
        this.testResults.versionCheck = true;
        this.log('✅ Tika service is healthy', {
          version: response.data,
          status: response.status
        });
        return true;
      }
      
      return false;
    } catch (error) {
      this.log('❌ Tika service health check failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }
  }

  async testTextExtraction() {
    try {
      this.log('📄 Testing Tika text extraction...');
      
      // Create a sample text document
      const sampleText = `Sample Document for Tika Testing
      
Personal Information:
- Name: Dr. Sarah Johnson
- Email: sarah.johnson@medical.org
- Phone: (555) 987-6543
- SSN: 123-45-6789
- Medical License: MD12345

Patient Data:
- Patient ID: P001234
- Credit Card: 4111-1111-1111-1111
- Address: 456 Healthcare Ave, Medical City, MC 12345

This document contains various PII types for testing text extraction capabilities.`;

      // Test plain text extraction
      const response = await axios.put(`${TIKA_URL}/tika`, sampleText, {
        headers: {
          'Content-Type': 'text/plain',
          'Accept': 'text/plain'
        },
        timeout: 30000
      });

      if (response.status === 200 && response.data) {
        this.testResults.textExtraction = true;
        this.log('✅ Text extraction successful', {
          extractedLength: response.data.length,
          extractedPreview: response.data.substring(0, 200) + '...'
        });
        return true;
      }
      
      return false;
    } catch (error) {
      this.log('❌ Text extraction test failed', {
        error: error.message,
        status: error.response?.status
      });
      return false;
    }
  }

  async testMetadataExtraction() {
    try {
      this.log('📊 Testing Tika metadata extraction...');
      
      const sampleText = 'Test document for metadata extraction';
      
      const response = await axios.put(`${TIKA_URL}/meta`, sampleText, {
        headers: {
          'Content-Type': 'text/plain',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200 && response.data) {
        this.testResults.metadataExtraction = true;
        this.log('✅ Metadata extraction successful', {
          metadata: response.data
        });
        return true;
      }
      
      return false;
    } catch (error) {
      this.log('❌ Metadata extraction test failed', {
        error: error.message,
        status: error.response?.status
      });
      return false;
    }
  }

  async runTests() {
    console.log('🚀 Starting Apache Tika Integration Test');
    console.log('========================================\n');

    const startTime = Date.now();

    // Run test steps
    const testSteps = [
      () => this.checkTikaHealth(),
      () => this.testTextExtraction(),
      () => this.testMetadataExtraction()
    ];

    for (const step of testSteps) {
      const success = await step();
      if (!success) {
        this.log('❌ Test failed at step, but continuing...');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print results
    console.log('\n========================================');
    console.log('📊 Apache Tika Integration Test Results');
    console.log('========================================');

    const results = Object.entries(this.testResults);
    const passed = results.filter(([_, success]) => success).length;
    const total = results.length;

    results.forEach(([test, success]) => {
      console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'PASSED' : 'FAILED'}`);
    });

    console.log('\n========================================');
    console.log(`📈 Overall Result: ${passed}/${total} tests passed`);
    console.log(`⏱️ Total Duration: ${duration} seconds`);
    
    const overallSuccess = passed >= 3;
    console.log(`🎯 Tika Integration Status: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('========================================\n');

    if (overallSuccess) {
      console.log('🎉 Apache Tika integration is working correctly!');
      console.log('✨ Ready for document processing and text extraction');
    } else {
      console.log('⚠️  Tika service needs attention');
      console.log('🔧 Check if Tika container is running on port 9998');
    }

    return overallSuccess;
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new TikaIntegrationTester();
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}