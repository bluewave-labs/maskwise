#!/usr/bin/env node

/**
 * Simplified Workflow Test
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:3001';
const TEST_FILE_PATH = '/Users/gorkemcetin/maskwise/test-data.txt';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSimpleTest() {
  console.log('🧪 Running Simple Workflow Test...\n');
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    const authToken = loginResponse.data.accessToken;
    console.log('   ✅ Login successful');
    
    // Step 2: Create Project
    console.log('2. Creating project...');
    const projectResponse = await axios.post(`${API_BASE_URL}/projects`, {
      name: `Test Project ${Date.now()}`,
      description: 'Automated test project',
      tags: ['test']
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    const projectId = projectResponse.data.id;
    console.log(`   ✅ Project created: ${projectId}`);
    
    // Step 3: Upload File
    console.log('3. Uploading file...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));
    formData.append('projectId', projectId);
    formData.append('description', 'Test file with PII');
    
    const uploadResponse = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });
    const datasetId = uploadResponse.data.dataset.id;
    const jobId = uploadResponse.data.job?.id;
    console.log(`   ✅ File uploaded - Dataset: ${datasetId}, Job: ${jobId}`);
    
    // Step 4: Wait for completion
    console.log('4. Waiting for job completion...');
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds max
    
    while (attempts < maxAttempts) {
      await sleep(2000);
      attempts++;
      
      const statusResponse = await axios.get(`${API_BASE_URL}/datasets/${datasetId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const status = statusResponse.data.status;
      console.log(`   ⏳ Status: ${status} (attempt ${attempts}/${maxAttempts})`);
      
      if (status === 'COMPLETED') {
        console.log('   ✅ Job completed!');
        break;
      } else if (status === 'FAILED') {
        console.log('   ❌ Job failed!');
        return;
      }
      
      if (attempts === maxAttempts) {
        console.log('   ⏰ Timeout reached');
        return;
      }
    }
    
    // Step 5: Get Results
    console.log('5. Retrieving results...');
    const findingsResponse = await axios.get(`${API_BASE_URL}/datasets/${datasetId}/findings`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const findings = findingsResponse.data.findings;
    console.log(`   ✅ Retrieved ${findings.length} findings:`);
    
    findings.forEach((finding, i) => {
      console.log(`      ${i+1}. ${finding.entityType}: "${finding.text}" (${finding.confidence})`);
    });
    
    // Step 6: Cleanup
    console.log('6. Cleaning up...');
    await axios.delete(`${API_BASE_URL}/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('   ✅ Project deleted');
    
    console.log('\n🎉 Simple workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

runSimpleTest();