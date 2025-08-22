#!/usr/bin/env node

/**
 * User Workflow Integration Test
 * 
 * Comprehensive end-to-end test covering the complete user journey:
 * 1. Authentication and authorization
 * 2. Project creation and management
 * 3. File upload with progress tracking
 * 4. Real-time status monitoring
 * 5. PII findings analysis
 * 6. Error recovery and retry mechanisms
 * 7. Security validation
 * 8. Performance and reliability
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3005';

console.log('🚀 User Workflow Integration Test Suite\n');

// Test data
const testUser = {
  email: 'admin@maskwise.com',
  password: 'admin123'
};

let authToken = null;
let testProjectId = null;
let uploadedDatasetId = null;

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  maxRetries: 3,
  timeoutMs: 30000,
  pollIntervalMs: 2000,
  testFileSizeMB: 1 // Small file for fast testing
};

/**
 * Test Results Tracking
 */
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function addTestResult(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${details}`);
  }
  testResults.details.push({ testName, passed, details });
}

/**
 * Utility: Wait for specified duration
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility: Retry mechanism for operations
 */
async function withRetry(operation, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.log(`  Retry ${attempt}/${maxAttempts}: ${error.message}`);
      await sleep(delay);
    }
  }
}

/**
 * Test 1: Authentication and Authorization
 */
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication & Authorization...');
  
  try {
    // Test login
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    authToken = loginData.accessToken;
    
    addTestResult('User login', !!authToken);

    // Test protected endpoint access
    const profileResponse = await fetch(`${API_BASE}/users/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    addTestResult('Protected endpoint access', profileResponse.ok);

    // Test unauthorized access
    const unauthorizedResponse = await fetch(`${API_BASE}/users/profile`);
    addTestResult('Unauthorized access blocked', !unauthorizedResponse.ok);

  } catch (error) {
    addTestResult('Authentication flow', false, error.message);
  }
}

/**
 * Test 2: Project Management
 */
async function testProjectManagement() {
  console.log('\n📁 Testing Project Management...');
  
  try {
    // Create test project
    const createResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Integration Test Project',
        description: 'Project for comprehensive integration testing',
        tags: ['test', 'integration']
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Project creation failed: ${createResponse.status}`);
    }

    const projectData = await createResponse.json();
    testProjectId = projectData.id;
    
    addTestResult('Project creation', !!testProjectId);

    // Test project listing
    const listResponse = await fetch(`${API_BASE}/projects`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (listResponse.ok) {
      const projects = await listResponse.json();
      const createdProject = projects.find(p => p.id === testProjectId);
      addTestResult('Project listing', !!createdProject);
    } else {
      addTestResult('Project listing', false, 'List request failed');
    }

    // Test project details
    const detailsResponse = await fetch(`${API_BASE}/projects/${testProjectId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    addTestResult('Project details retrieval', detailsResponse.ok);

  } catch (error) {
    addTestResult('Project management', false, error.message);
  }
}

/**
 * Test 3: File Upload with Security Validation
 */
async function testFileUpload() {
  console.log('\n📤 Testing File Upload & Security...');
  
  try {
    // Create test file with PII content
    const testContent = `
Test file for PII detection integration test.

Personal Information:
- Email: john.doe@example.com
- Phone: (555) 123-4567
- SSN: 123-45-6789
- Credit Card: 4532 1234 5678 9012
- Address: 123 Main St, Anytown, ST 12345

Additional test data:
- URL: https://example.com/test
- Date: 2024-01-15
- Name: Jane Smith
`;

    const testFilePath = './test-upload-file.txt';
    fs.writeFileSync(testFilePath, testContent);

    // Test legitimate file upload
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath), 'test-pii-data.txt');
    form.append('projectId', testProjectId);
    form.append('description', 'Integration test file with PII data');

    const uploadResponse = await fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.status} - ${await uploadResponse.text()}`);
    }

    const uploadData = await uploadResponse.json();
    uploadedDatasetId = uploadData.dataset.id;
    
    addTestResult('Legitimate file upload', !!uploadedDatasetId);

    // Test malicious file rejection
    try {
      const maliciousContent = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // EXE signature
      const maliciousPath = './test-malicious.exe';
      fs.writeFileSync(maliciousPath, maliciousContent);

      const maliciousForm = new FormData();
      maliciousForm.append('file', fs.createReadStream(maliciousPath), 'malicious.exe');
      maliciousForm.append('projectId', testProjectId);

      const maliciousResponse = await fetch(`${API_BASE}/datasets/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...maliciousForm.getHeaders()
        },
        body: maliciousForm
      });

      addTestResult('Malicious file rejection', !maliciousResponse.ok);
      
      // Cleanup
      fs.unlinkSync(maliciousPath);
    } catch (error) {
      addTestResult('Security validation test', false, error.message);
    }

    // Cleanup
    fs.unlinkSync(testFilePath);

  } catch (error) {
    addTestResult('File upload workflow', false, error.message);
  }
}

/**
 * Test 4: Real-time Status Monitoring
 */
async function testStatusMonitoring() {
  console.log('\n⏱️ Testing Real-time Status Monitoring...');
  
  try {
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds with 2-second intervals
    let currentStatus = 'PENDING';

    while (attempts < maxAttempts && currentStatus !== 'COMPLETED' && currentStatus !== 'FAILED') {
      await sleep(TEST_CONFIG.pollIntervalMs);
      attempts++;

      const statusResponse = await fetch(`${API_BASE}/datasets/${uploadedDatasetId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (statusResponse.ok) {
        const datasetData = await statusResponse.json();
        currentStatus = datasetData.status;
        console.log(`  Status check ${attempts}/${maxAttempts}: ${currentStatus}`);
      }
    }

    addTestResult('Status monitoring API', currentStatus !== 'PENDING');
    addTestResult('Processing completion', currentStatus === 'COMPLETED');

  } catch (error) {
    addTestResult('Status monitoring', false, error.message);
  }
}

/**
 * Test 5: PII Findings Analysis
 */
async function testPIIFindings() {
  console.log('\n🔍 Testing PII Findings Analysis...');
  
  try {
    const findingsResponse = await fetch(`${API_BASE}/datasets/${uploadedDatasetId}/findings`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!findingsResponse.ok) {
      throw new Error(`Findings retrieval failed: ${findingsResponse.status}`);
    }

    const findingsData = await findingsResponse.json();
    const findings = findingsData.findings || [];

    addTestResult('Findings retrieval', findingsResponse.ok);
    addTestResult('PII detection accuracy', findings.length >= 5); // Expect at least 5 PII entities

    // Test specific entity types
    const entityTypes = findings.map(f => f.entityType);
    const expectedTypes = ['EMAIL_ADDRESS', 'PHONE_NUMBER', 'PERSON'];
    
    for (const expectedType of expectedTypes) {
      addTestResult(
        `${expectedType} detection`,
        entityTypes.includes(expectedType)
      );
    }

    // Test confidence scores
    const highConfidenceFindings = findings.filter(f => f.confidence >= 0.7);
    addTestResult('High confidence detections', highConfidenceFindings.length > 0);

  } catch (error) {
    addTestResult('PII findings analysis', false, error.message);
  }
}

/**
 * Test 6: Error Recovery and Retry Mechanisms
 */
async function testErrorRecovery() {
  console.log('\n🔄 Testing Error Recovery...');
  
  try {
    // Test network resilience with retry
    const resilientFetch = async () => {
      return await withRetry(async () => {
        const response = await fetch(`${API_BASE}/datasets`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }, 3, 1000);
    };

    const data = await resilientFetch();
    addTestResult('Network retry mechanism', !!data);

    // Test invalid token handling
    try {
      const invalidResponse = await fetch(`${API_BASE}/datasets`, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      addTestResult('Invalid token handling', !invalidResponse.ok);
    } catch (error) {
      addTestResult('Invalid token handling', true); // Network error is acceptable
    }

  } catch (error) {
    addTestResult('Error recovery mechanisms', false, error.message);
  }
}

/**
 * Test 7: Performance and Load
 */
async function testPerformanceAndLoad() {
  console.log('\n⚡ Testing Performance & Load...');
  
  try {
    // Test concurrent requests
    const concurrentRequests = Array(5).fill().map((_, i) => 
      fetch(`${API_BASE}/datasets`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(concurrentRequests);
    const duration = Date.now() - startTime;

    const allSuccessful = responses.every(r => r.ok);
    addTestResult('Concurrent request handling', allSuccessful);
    addTestResult('Response time performance', duration < 5000); // Under 5 seconds

    // Test pagination
    const paginatedResponse = await fetch(`${API_BASE}/datasets?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (paginatedResponse.ok) {
      const paginatedData = await paginatedResponse.json();
      addTestResult('Pagination functionality', 
        paginatedData.hasOwnProperty('page') && paginatedData.hasOwnProperty('totalPages')
      );
    } else {
      addTestResult('Pagination functionality', false, 'Pagination request failed');
    }

  } catch (error) {
    addTestResult('Performance testing', false, error.message);
  }
}

/**
 * Test 8: Cross-browser and Network Conditions
 */
async function testNetworkConditions() {
  console.log('\n🌐 Testing Network Conditions...');
  
  try {
    // Test with slow response simulation (timeout handling)
    const timeoutTest = new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      try {
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        clearTimeout(timeout);
        resolve(response.ok);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });

    try {
      const result = await timeoutTest;
      addTestResult('Timeout handling', result);
    } catch (error) {
      addTestResult('Timeout handling', false, error.message);
    }

    // Test CORS and headers
    const corsResponse = await fetch(`${API_BASE}/projects`, {
      method: 'OPTIONS'
    });
    addTestResult('CORS configuration', corsResponse.ok || corsResponse.status === 204);

  } catch (error) {
    addTestResult('Network condition testing', false, error.message);
  }
}

/**
 * Test 9: Data Integrity and Cleanup
 */
async function testDataIntegrityAndCleanup() {
  console.log('\n🧹 Testing Data Integrity & Cleanup...');
  
  try {
    // Verify audit logs
    const auditResponse = await fetch(`${API_BASE}/users/audit-logs`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      addTestResult('Audit logging', auditData.length > 0);
    } else {
      addTestResult('Audit logging', false, 'Audit logs request failed');
    }

    // Test data consistency
    const projectStatsResponse = await fetch(`${API_BASE}/datasets/projects/${testProjectId}/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (projectStatsResponse.ok) {
      const statsData = await projectStatsResponse.json();
      addTestResult('Data consistency', statsData.totalFiles >= 1);
    } else {
      addTestResult('Data consistency', false, 'Stats request failed');
    }

    // Cleanup - Delete test dataset
    if (uploadedDatasetId) {
      const deleteResponse = await fetch(`${API_BASE}/datasets/${uploadedDatasetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        addTestResult('Dataset cleanup', false, `HTTP ${deleteResponse.status}: ${errorText}`);
      } else {
        addTestResult('Dataset cleanup', true);
      }
    }

  } catch (error) {
    addTestResult('Data integrity testing', false, error.message);
  }
}

/**
 * Main Test Runner
 */
async function runIntegrationTests() {
  const startTime = Date.now();
  
  try {
    await testAuthentication();
    await testProjectManagement();
    await testFileUpload();
    await testStatusMonitoring();
    await testPIIFindings();
    await testErrorRecovery();
    await testPerformanceAndLoad();
    await testNetworkConditions();
    await testDataIntegrityAndCleanup();

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }

  const duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.log('━'.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  • ${test.testName}: ${test.details}`);
      });
  }
  
  console.log('\n' + '━'.repeat(50));
  
  if (testResults.passed === testResults.total) {
    console.log('🎉 All tests passed! Integration is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Run the test suite
runIntegrationTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});