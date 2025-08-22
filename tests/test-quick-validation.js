#!/usr/bin/env node

/**
 * Quick Validation Test - Check if PII analysis is working
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:3001';
const TEST_FILE_PATH = '/Users/gorkemcetin/maskwise/test-data.txt';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function quickTest() {
  console.log('🧪 Quick PII Analysis Validation Test\n');
  
  try {
    // 1. Login
    console.log('1. Authenticating...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    const authToken = loginResponse.data.accessToken;
    console.log('   ✅ Authenticated');
    
    // 2. Create project
    console.log('2. Creating project...');
    const projectResponse = await axios.post(`${API_BASE_URL}/projects`, {
      name: `Quick Test ${Date.now()}`,
      description: 'Quick validation test'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    });
    const projectId = projectResponse.data.id;
    console.log(`   ✅ Project: ${projectId}`);
    
    // 3. Upload file
    console.log('3. Uploading file...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));
    formData.append('projectId', projectId);
    
    const uploadResponse = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: { 'Authorization': `Bearer ${authToken}`, ...formData.getHeaders() }
    });
    const datasetId = uploadResponse.data.dataset.id;
    const jobId = uploadResponse.data.job?.id;
    console.log(`   ✅ Dataset: ${datasetId}, Job: ${jobId}`);
    
    // 4. Wait and check status multiple times
    console.log('4. Monitoring job progress...');
    for (let i = 0; i < 20; i++) {  // Check for up to 60 seconds
      await sleep(3000);
      
      try {
        const statusResponse = await axios.get(`${API_BASE_URL}/datasets/${datasetId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const status = statusResponse.data.status;
        console.log(`   📊 Attempt ${i + 1}: Status = ${status}`);
        
        if (status === 'COMPLETED') {
          console.log('   ✅ Job completed successfully!');
          
          // 5. Get findings
          console.log('5. Retrieving findings...');
          const findingsResponse = await axios.get(`${API_BASE_URL}/datasets/${datasetId}/findings`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { page: 1, limit: 20 }
          });
          
          const findings = findingsResponse.data.findings;
          console.log(`   ✅ Found ${findings.length} PII entities:`);
          
          findings.forEach((finding, index) => {
            const confidence = Math.round(finding.confidence * 100);
            console.log(`      ${index + 1}. ${finding.entityType}: "${finding.text}" (${confidence}%)`);
          });
          
          // 6. Cleanup
          await axios.delete(`${API_BASE_URL}/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          console.log('   ✅ Cleaned up');
          
          console.log('\n🎉 SUCCESS: PII analysis pipeline is working correctly!');
          return;
          
        } else if (status === 'FAILED') {
          console.log('   ❌ Job failed');
          return;
        }
      } catch (error) {
        console.log(`   ⚠️  Status check ${i + 1} failed:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('   ⏰ Timeout - job did not complete in time');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

quickTest();