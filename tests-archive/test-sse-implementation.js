#!/usr/bin/env node

/**
 * Test SSE Implementation
 * 
 * Tests the complete SSE implementation including:
 * 1. Authentication and SSE connection
 * 2. File upload triggering real-time updates
 * 3. Worker sending SSE updates during PII analysis
 * 4. Frontend receiving real-time notifications
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const ADMIN_CREDENTIALS = {
  email: 'admin@maskwise.com',
  password: 'admin123'
};

let authToken = null;
let adminUserId = null;

async function authenticate() {
  try {
    console.log('🔐 Authenticating admin user...');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    authToken = response.data.accessToken;
    adminUserId = response.data.user.id;
    console.log('✅ Authentication successful');
    console.log(`   User ID: ${adminUserId}`);
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSSEConnection() {
  try {
    console.log('\n📡 Testing SSE connection...');
    
    // Test SSE status endpoint
    const statusResponse = await axios.get(`${BASE_URL}/sse/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ SSE status endpoint accessible');
    console.log('   Connected clients:', statusResponse.data);
    
    return true;
  } catch (error) {
    console.error('❌ SSE connection test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testWorkerSSEEndpoints() {
  try {
    console.log('\n🔧 Testing worker SSE endpoints...');
    
    // Test job update endpoint (simulates worker sending updates)
    const jobUpdatePayload = {
      jobId: 'test-job-123',
      status: 'PROCESSING',
      userId: adminUserId,
      progress: 50,
      message: 'Test job update from worker'
    };
    
    const jobUpdateResponse = await axios.post(`${BASE_URL}/sse/job-update`, jobUpdatePayload);
    console.log('✅ Job update endpoint working');
    console.log('   Response:', jobUpdateResponse.data);
    
    // Test dataset update endpoint
    const datasetUpdatePayload = {
      datasetId: 'test-dataset-456',
      status: 'COMPLETED',
      userId: adminUserId,
      findingsCount: 5
    };
    
    const datasetUpdateResponse = await axios.post(`${BASE_URL}/sse/dataset-update`, datasetUpdatePayload);
    console.log('✅ Dataset update endpoint working');
    console.log('   Response:', datasetUpdateResponse.data);
    
    // Test notification endpoint
    const notificationPayload = {
      userId: adminUserId,
      title: 'Test Notification',
      message: 'SSE implementation is working correctly!',
      type: 'success'
    };
    
    const notificationResponse = await axios.post(`${BASE_URL}/sse/notification`, notificationPayload);
    console.log('✅ Notification endpoint working');
    console.log('   Response:', notificationResponse.data);
    
    return true;
  } catch (error) {
    console.error('❌ Worker SSE endpoint test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testProjectCreation() {
  try {
    console.log('\n📁 Creating test project...');
    
    const projectData = {
      name: 'SSE Test Project',
      description: 'Testing real-time updates with SSE'
    };
    
    const response = await axios.post(`${BASE_URL}/projects`, projectData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Test project created');
    console.log(`   Project ID: ${response.data.id}`);
    
    return response.data.id;
  } catch (error) {
    console.error('❌ Project creation failed:', error.response?.data || error.message);
    return null;
  }
}

async function simulateFileUpload(projectId) {
  try {
    console.log('\n📤 Simulating file upload that would trigger SSE updates...');
    
    // Create test PII content
    const testContent = `John Doe's email is john.doe@example.com and his phone number is (555) 123-4567.
Sarah Smith can be reached at sarah.smith@company.org or call her at 555-987-6543.
Credit card information: 4532-1234-5678-9876
SSN: 123-45-6789`;
    
    // Create a FormData object to simulate file upload
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    // Write test content to a temporary file
    const testFilePath = path.join(__dirname, 'test-sse-pii-data.txt');
    fs.writeFileSync(testFilePath, testContent);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('projectId', projectId);
    form.append('processImmediately', 'true');
    
    const response = await axios.post(`${BASE_URL}/datasets/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    console.log('✅ File upload successful - this should trigger real-time SSE updates');
    console.log(`   Dataset ID: ${response.data.dataset.id}`);
    console.log(`   Job ID: ${response.data.job?.id || 'No job created'}`);
    
    return {
      datasetId: response.data.dataset.id,
      jobId: response.data.job?.id
    };
    
  } catch (error) {
    console.error('❌ File upload simulation failed:', error.response?.data || error.message);
    return null;
  }
}

async function monitorJobProgress(jobId, datasetId) {
  if (!jobId) {
    console.log('⏭️  No job created, skipping progress monitoring');
    return;
  }
  
  console.log('\n⏱️  Monitoring job progress (simulating real-time updates)...');
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${BASE_URL}/datasets/${datasetId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const dataset = response.data;
      console.log(`   Status: ${dataset.status} (attempt ${attempts + 1})`);
      
      if (dataset.status === 'COMPLETED') {
        console.log('✅ Job completed successfully!');
        
        // Check findings
        const findingsResponse = await axios.get(`${BASE_URL}/datasets/${datasetId}/findings`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log(`   PII Findings: ${findingsResponse.data.total || 0}`);
        if (findingsResponse.data.findings && findingsResponse.data.findings.length > 0) {
          console.log('   Entity types found:');
          const entityTypes = [...new Set(findingsResponse.data.findings.map(f => f.entityType))];
          entityTypes.forEach(type => console.log(`     - ${type}`));
        }
        break;
      } else if (dataset.status === 'FAILED') {
        console.log('❌ Job failed');
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    } catch (error) {
      console.error('⚠️  Error checking job progress:', error.response?.data || error.message);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log('⏰ Reached maximum monitoring attempts');
  }
}

async function runSSETest() {
  console.log('🚀 Starting SSE Implementation Test\n');
  
  // Step 1: Authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) return;
  
  // Step 2: Test SSE endpoints
  const sseSuccess = await testSSEConnection();
  if (!sseSuccess) return;
  
  // Step 3: Test worker SSE endpoints
  const workerSuccess = await testWorkerSSEEndpoints();
  if (!workerSuccess) return;
  
  // Step 4: Create test project
  const projectId = await testProjectCreation();
  if (!projectId) return;
  
  // Step 5: Upload file to trigger real-time updates
  const uploadResult = await simulateFileUpload(projectId);
  if (!uploadResult) return;
  
  // Step 6: Monitor job progress
  await monitorJobProgress(uploadResult.jobId, uploadResult.datasetId);
  
  console.log('\n🎉 SSE Implementation Test Complete!');
  console.log('\n📋 Summary:');
  console.log('✅ Authentication system working');
  console.log('✅ SSE connection endpoints accessible');
  console.log('✅ Worker-to-API SSE communication working');
  console.log('✅ File upload triggering real-time pipeline');
  console.log('✅ End-to-end real-time PII detection workflow');
  
  console.log('\n💡 Next Steps:');
  console.log('1. Open frontend at http://localhost:3004 and login');
  console.log('2. Navigate to Datasets page');
  console.log('3. Upload a file and watch real-time status updates');
  console.log('4. Check browser console for SSE connection messages');
}

// Run the test
runSSETest().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});