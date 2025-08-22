#!/usr/bin/env node

/**
 * Complete File Upload to PII Detection Workflow Test
 * 
 * This script tests the complete workflow:
 * 1. Authenticate with the API
 * 2. Create/select a project
 * 3. Upload a file with PII content
 * 4. Wait for the PII analysis job to complete
 * 5. Retrieve and verify the PII findings
 * 
 * This verifies the entire pipeline from frontend file upload 
 * through backend processing to PII detection results.
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:3001';
const TEST_FILE_PATH = '/Users/gorkemcetin/maskwise/test-data.txt';

// Test configuration
const testConfig = {
  email: 'admin@example.com',
  password: 'admin123',
  projectName: `Test Project ${Date.now()}`,
  maxWaitTime: 30000 // 30 seconds max wait for job completion
};

let authToken = null;
let projectId = null;
let datasetId = null;
let jobId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testConfig.email,
      password: testConfig.password
    });
    
    authToken = response.data.access_token;
    console.log('   ✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('   ❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createProject() {
  console.log('📁 Creating test project...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/projects`, {
      name: testConfig.projectName,
      description: 'Automated test project for complete workflow validation',
      tags: ['test', 'automation', 'pii-detection']
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    projectId = response.data.id;
    console.log(`   ✅ Project created: ${response.data.name} (${projectId})`);
    return true;
  } catch (error) {
    console.error('   ❌ Project creation failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function uploadFile() {
  console.log('📤 Uploading test file...');
  
  try {
    // Check if test file exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
      throw new Error(`Test file not found: ${TEST_FILE_PATH}`);
    }
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));
    formData.append('projectId', projectId);
    formData.append('description', 'Test file with various PII types for automated workflow testing');
    
    const response = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });
    
    datasetId = response.data.id;
    jobId = response.data.job?.id;
    
    console.log(`   ✅ File uploaded successfully:`);
    console.log(`      Dataset ID: ${datasetId}`);
    console.log(`      Job ID: ${jobId}`);
    console.log(`      Filename: ${response.data.filename}`);
    console.log(`      File size: ${response.data.fileSize} bytes`);
    
    return true;
  } catch (error) {
    console.error('   ❌ File upload failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function waitForJobCompletion() {
  console.log('⏳ Waiting for PII analysis job to complete...');
  
  const startTime = Date.now();
  const maxWaitTime = testConfig.maxWaitTime;
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(`${API_BASE_URL}/datasets/${datasetId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const dataset = response.data;
      console.log(`   ⏱️  Job status: ${dataset.processingStatus} (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`);
      
      if (dataset.processingStatus === 'COMPLETED') {
        console.log('   ✅ PII analysis job completed!');
        return true;
      } else if (dataset.processingStatus === 'FAILED') {
        console.error('   ❌ PII analysis job failed');
        return false;
      }
      
      // Wait 2 seconds before checking again
      await sleep(2000);
    } catch (error) {
      console.error('   ❌ Error checking job status:', error.response?.data?.message || error.message);
      return false;
    }
  }
  
  console.error(`   ❌ Job did not complete within ${maxWaitTime/1000} seconds`);
  return false;
}

async function validateResults() {
  console.log('🔍 Validating PII detection results...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/datasets/${datasetId}/findings`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const findings = response.data.findings;
    console.log(`   ✅ Retrieved ${findings.length} PII findings:`);
    
    // Group findings by entity type for better readability
    const findingsByType = {};
    findings.forEach(finding => {
      if (!findingsByType[finding.entityType]) {
        findingsByType[finding.entityType] = [];
      }
      findingsByType[finding.entityType].push(finding);
    });
    
    // Display findings organized by type
    Object.keys(findingsByType).forEach(entityType => {
      const typedFindings = findingsByType[entityType];
      console.log(`   📋 ${entityType}: ${typedFindings.length} occurrences`);
      typedFindings.forEach((finding, index) => {
        console.log(`      ${index + 1}. "${finding.text}" (confidence: ${finding.confidence})`);
      });
    });
    
    // Validate expected PII types
    const expectedTypes = ['PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'US_SSN', 'CREDIT_CARD'];
    const detectedTypes = Object.keys(findingsByType);
    
    console.log('\n   🎯 Validation Summary:');
    expectedTypes.forEach(expectedType => {
      const found = detectedTypes.includes(expectedType);
      console.log(`      ${found ? '✅' : '❌'} ${expectedType}: ${found ? 'DETECTED' : 'NOT FOUND'}`);
    });
    
    const detectionRate = detectedTypes.filter(type => expectedTypes.includes(type)).length / expectedTypes.length;
    console.log(`   📊 Detection rate: ${Math.round(detectionRate * 100)}% (${detectedTypes.filter(type => expectedTypes.includes(type)).length}/${expectedTypes.length})`);
    
    return findings.length > 0;
  } catch (error) {
    console.error('   ❌ Failed to retrieve findings:', error.response?.data?.message || error.message);
    return false;
  }
}

async function cleanup() {
  console.log('🧹 Cleaning up test resources...');
  
  try {
    // Delete the test project (this will cascade delete datasets and findings)
    if (projectId) {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      console.log('   ✅ Test project deleted');
    }
  } catch (error) {
    console.error('   ⚠️  Cleanup warning:', error.response?.data?.message || error.message);
  }
}

async function runCompleteWorkflowTest() {
  console.log('🚀 Starting Complete File Upload to PII Detection Workflow Test');
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Authenticate
    if (!await authenticate()) {
      process.exit(1);
    }
    
    // Step 2: Create project
    if (!await createProject()) {
      process.exit(1);
    }
    
    // Step 3: Upload file
    if (!await uploadFile()) {
      await cleanup();
      process.exit(1);
    }
    
    // Step 4: Wait for job completion
    if (!await waitForJobCompletion()) {
      await cleanup();
      process.exit(1);
    }
    
    // Step 5: Validate results
    if (!await validateResults()) {
      await cleanup();
      process.exit(1);
    }
    
    // Step 6: Cleanup
    await cleanup();
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 Complete workflow test PASSED!');
    console.log('\n📋 Test Summary:');
    console.log('   • File upload: ✅ SUCCESS');
    console.log('   • PII analysis: ✅ SUCCESS'); 
    console.log('   • Results retrieval: ✅ SUCCESS');
    console.log('   • Data validation: ✅ SUCCESS');
    console.log('\n🚀 The complete file upload to PII detection pipeline is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Workflow test failed with unexpected error:', error.message);
    await cleanup();
    process.exit(1);
  }
}

// Run the test
runCompleteWorkflowTest();