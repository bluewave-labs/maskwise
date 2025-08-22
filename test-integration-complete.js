#!/usr/bin/env node

/**
 * Complete Integration Test - Maskwise PII Detection Platform
 * 
 * This test validates the complete end-to-end workflow:
 * 1. Authentication
 * 2. Project creation
 * 3. File upload with queue integration
 * 4. PII analysis job processing
 * 5. Results retrieval and validation
 * 6. Cleanup
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:3001';
const TEST_FILE_PATH = '/Users/gorkemcetin/maskwise/test-data.txt';

const config = {
  email: 'admin@example.com',
  password: 'admin123',
  maxWaitTime: 45000 // 45 seconds for job completion
};

let authToken = null;
let projectId = null;
let datasetId = null;
let jobId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function authenticate() {
  console.log('🔐 Step 1: Authentication');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: config.email,
      password: config.password
    });
    
    authToken = response.data.accessToken;
    console.log('   ✅ Authenticated successfully');
    return true;
  } catch (error) {
    console.error('   ❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createProject() {
  console.log('📁 Step 2: Project Creation');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/projects`, {
      name: `Integration Test ${Date.now()}`,
      description: 'End-to-end integration test project for PII detection workflow',
      tags: ['integration-test', 'pii-detection', 'validation']
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    projectId = response.data.id;
    console.log(`   ✅ Project created: "${response.data.name}" (${projectId})`);
    return true;
  } catch (error) {
    console.error('   ❌ Project creation failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function uploadFile() {
  console.log('📤 Step 3: File Upload with Queue Integration');
  
  try {
    if (!fs.existsSync(TEST_FILE_PATH)) {
      throw new Error(`Test file not found: ${TEST_FILE_PATH}`);
    }
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));
    formData.append('projectId', projectId);
    formData.append('description', 'Integration test file with comprehensive PII data');
    
    const response = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });
    
    datasetId = response.data.dataset.id;
    jobId = response.data.job?.id;
    
    console.log(`   ✅ File uploaded successfully:`);
    console.log(`      Dataset ID: ${datasetId}`);
    console.log(`      Job ID: ${jobId}`);
    console.log(`      Filename: ${response.data.dataset.filename}`);
    console.log(`      File size: ${response.data.dataset.fileSize} bytes`);
    console.log(`      Message: ${response.data.message}`);
    
    // Verify job was queued
    if (jobId) {
      console.log('   ✅ Job queued for processing');
      return true;
    } else {
      console.error('   ⚠️  No job ID returned - queue integration may have failed');
      return false;
    }
  } catch (error) {
    console.error('   ❌ File upload failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function waitForJobCompletion() {
  console.log('⏳ Step 4: Waiting for PII Analysis Job Completion');
  
  const startTime = Date.now();
  const maxWaitTime = config.maxWaitTime;
  let lastStatus = null;
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(`${API_BASE_URL}/datasets/${datasetId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const dataset = response.data;
      const currentStatus = dataset.status;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      // Only log status changes to reduce noise
      if (currentStatus !== lastStatus) {
        console.log(`   📊 Status: ${currentStatus} (elapsed: ${elapsed}s)`);
        lastStatus = currentStatus;
      }
      
      if (currentStatus === 'COMPLETED') {
        console.log('   ✅ PII analysis job completed successfully!');
        console.log(`   ⏱️  Total processing time: ${elapsed} seconds`);
        return true;
      } else if (currentStatus === 'FAILED') {
        console.error('   ❌ PII analysis job failed');
        console.error(`   📋 Dataset status: ${JSON.stringify(dataset, null, 2)}`);
        return false;
      }
      
      // Wait 3 seconds before next check
      await sleep(3000);
    } catch (error) {
      console.error('   ❌ Error checking job status:', error.response?.data?.message || error.message);
      return false;
    }
  }
  
  console.error(`   ⏰ Job did not complete within ${maxWaitTime/1000} seconds`);
  return false;
}

async function validateResults() {
  console.log('🔍 Step 5: Results Validation');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/datasets/${datasetId}/findings`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        limit: 50
      }
    });
    
    const findings = response.data.findings;
    const pagination = response.data.pagination;
    
    console.log(`   ✅ Retrieved ${findings.length} PII findings`);
    console.log(`   📊 Pagination: Page ${pagination.page}/${pagination.pages}, Total: ${pagination.total}`);
    
    // Group findings by entity type for analysis
    const findingsByType = {};
    findings.forEach(finding => {
      if (!findingsByType[finding.entityType]) {
        findingsByType[finding.entityType] = [];
      }
      findingsByType[finding.entityType].push(finding);
    });
    
    // Display detailed results
    console.log(`   📋 Findings Summary:`);
    Object.keys(findingsByType).forEach(entityType => {
      const typedFindings = findingsByType[entityType];
      console.log(`      ${entityType}: ${typedFindings.length} occurrences`);
      
      // Show up to 3 examples per type
      const examples = typedFindings.slice(0, 3);
      examples.forEach((finding, index) => {
        const confidence = Math.round(finding.confidence * 100);
        console.log(`         ${index + 1}. "${finding.text}" (confidence: ${confidence}%)`);
      });
      
      if (typedFindings.length > 3) {
        console.log(`         ... and ${typedFindings.length - 3} more`);
      }
    });
    
    // Validate expected PII types from our test data
    const expectedTypes = ['PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'US_SSN', 'CREDIT_CARD'];
    const detectedTypes = Object.keys(findingsByType);
    
    console.log(`\n   🎯 Detection Validation:`);
    let detectedCount = 0;
    expectedTypes.forEach(expectedType => {
      const found = detectedTypes.includes(expectedType);
      if (found) detectedCount++;
      console.log(`      ${found ? '✅' : '❌'} ${expectedType}: ${found ? 'DETECTED' : 'NOT FOUND'}`);
    });
    
    const detectionRate = detectedCount / expectedTypes.length;
    console.log(`\n   📈 Overall Detection Rate: ${Math.round(detectionRate * 100)}% (${detectedCount}/${expectedTypes.length})`);
    
    // Consider test successful if we detect at least 3 types and have some findings
    const testPassed = findings.length > 0 && detectedCount >= 3;
    
    if (testPassed) {
      console.log('   ✅ Results validation PASSED');
    } else {
      console.log('   ⚠️  Results validation WARNING - Limited detection');
    }
    
    return testPassed;
  } catch (error) {
    console.error('   ❌ Results validation failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function cleanup() {
  console.log('🧹 Step 6: Cleanup');
  
  try {
    if (projectId) {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      console.log('   ✅ Test project and associated data deleted');
    }
  } catch (error) {
    console.error('   ⚠️  Cleanup warning:', error.response?.data?.message || error.message);
  }
}

async function runCompleteIntegrationTest() {
  console.log('🚀 Maskwise PII Detection Platform - Complete Integration Test');
  console.log('='.repeat(80));
  console.log('Testing: File Upload → Queue Processing → PII Analysis → Results\n');
  
  const startTime = Date.now();
  
  try {
    // Execute test steps
    if (!await authenticate()) process.exit(1);
    if (!await createProject()) { await cleanup(); process.exit(1); }
    if (!await uploadFile()) { await cleanup(); process.exit(1); }
    if (!await waitForJobCompletion()) { await cleanup(); process.exit(1); }
    if (!await validateResults()) { await cleanup(); process.exit(1); }
    
    // Cleanup
    await cleanup();
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPLETE INTEGRATION TEST PASSED!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Authentication: SUCCESS');
    console.log('   ✅ Project Management: SUCCESS');
    console.log('   ✅ File Upload: SUCCESS');
    console.log('   ✅ Queue Integration: SUCCESS');
    console.log('   ✅ PII Analysis: SUCCESS');
    console.log('   ✅ Results Retrieval: SUCCESS');
    console.log('   ✅ Data Cleanup: SUCCESS');
    console.log(`\n⏱️  Total Test Duration: ${totalTime} seconds`);
    console.log('\n🚀 The Maskwise PII Detection Platform is fully operational!');
    console.log('✨ End-to-end workflow validated successfully.');
    
  } catch (error) {
    console.error('\n❌ Integration test failed with unexpected error:', error.message);
    await cleanup();
    process.exit(1);
  }
}

// Run the complete integration test
runCompleteIntegrationTest();