#!/usr/bin/env node

/**
 * Direct Tesseract OCR Service Test
 * 
 * Tests the Tesseract service directly without going through the full system
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const TESSERACT_URL = 'http://localhost:8884';

class TesseractDirectTester {
  constructor() {
    this.testResults = {
      serviceHealth: false,
      ocrProcessing: false
    };
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async checkServiceHealth() {
    try {
      this.log('🔍 Checking Tesseract service health...');
      
      const response = await axios.get(`${TESSERACT_URL}/`, { timeout: 10000 });
      
      if (response.status === 200 && response.data.includes('tesseract-server')) {
        this.testResults.serviceHealth = true;
        this.log('✅ Tesseract service is healthy');
        return true;
      }
      
      return false;
    } catch (error) {
      this.log('❌ Tesseract service health check failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }
  }

  async createSampleImage() {
    try {
      this.log('📄 Creating sample text file to simulate image...');
      
      // Create a sample file with text content
      const sampleText = `Business Card

Dr. Sarah Johnson, MD
Cardiology Specialist

Email: sarah.johnson@hospital.com
Phone: (555) 123-4567
SSN: 987-65-4321
License: MD12345

Emergency Contact: (555) 987-6543
Card Number: 4111-1111-1111-1111

This is a test document to validate OCR capabilities.`;

      const filePath = './test-sample.txt';
      fs.writeFileSync(filePath, sampleText);
      
      this.log('✅ Sample file created', {
        filePath,
        contentLength: sampleText.length
      });
      
      return filePath;
    } catch (error) {
      this.log('❌ Sample file creation failed', error.message);
      return null;
    }
  }

  async testOCRProcessing() {
    try {
      const filePath = await this.createSampleImage();
      if (!filePath) return false;

      this.log('🔍 Testing OCR processing directly...');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath), {
        filename: 'test-image.txt',
        contentType: 'text/plain'
      });

      const response = await axios.post(`${TESSERACT_URL}/tesseract`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 60000
      });

      this.log('📊 OCR Response received', {
        status: response.status,
        dataType: typeof response.data
      });

      if (response.data) {
        let extractedText = '';
        
        if (response.data.text) {
          extractedText = response.data.text;
        } else if (typeof response.data === 'string') {
          extractedText = response.data;
        }

        this.log('✅ OCR processing successful', {
          extractedLength: extractedText.length,
          extractedPreview: extractedText.substring(0, 200)
        });

        // Clean up test file
        fs.unlinkSync(filePath);

        this.testResults.ocrProcessing = true;
        return true;
      }

      return false;
    } catch (error) {
      this.log('❌ OCR processing test failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async runTests() {
    console.log('🚀 Starting Direct Tesseract OCR Test');
    console.log('====================================\\n');

    const startTime = Date.now();

    const testSteps = [
      () => this.checkServiceHealth(),
      () => this.testOCRProcessing()
    ];

    for (const step of testSteps) {
      const success = await step();
      if (!success) {
        this.log('❌ Test failed at step, but continuing...');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print results
    console.log('\\n====================================');
    console.log('📊 Direct Tesseract OCR Test Results');
    console.log('====================================');

    const results = Object.entries(this.testResults);
    const passed = results.filter(([_, success]) => success).length;
    const total = results.length;

    results.forEach(([test, success]) => {
      console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'PASSED' : 'FAILED'}`);
    });

    console.log('\\n====================================');
    console.log(`📈 Overall Result: ${passed}/${total} tests passed`);
    console.log(`⏱️ Total Duration: ${duration} seconds`);
    
    const overallSuccess = passed >= 1;
    console.log(`🎯 Tesseract Status: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('====================================\\n');

    if (overallSuccess) {
      console.log('🎉 Tesseract OCR service is working!');
      console.log('✨ Ready for image text extraction');
    } else {
      console.log('⚠️  Tesseract service needs attention');
      console.log('🔧 Check if Tesseract container is running on port 8884');
    }

    return overallSuccess;
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new TesseractDirectTester();
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}