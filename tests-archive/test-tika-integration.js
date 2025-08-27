const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3001';

// Test credentials
const TEST_USER = {
  email: 'admin@maskwise.com',
  password: 'admin123'
};

let authToken = '';

async function authenticateUser() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    authToken = response.data.accessToken;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function getProjects() {
  try {
    const response = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const projects = response.data;
    if (projects.length > 0) {
      console.log(`✅ Found ${projects.length} projects`);
      return projects[0].id; // Use first project
    } else {
      console.log('📋 No projects found, creating one...');
      const newProject = await axios.post(`${API_BASE}/projects`, {
        name: 'Tika Integration Test',
        description: 'Testing Tika service integration with document processing'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log(`✅ Created project: ${newProject.data.name}`);
      return newProject.data.id;
    }
  } catch (error) {
    console.error('❌ Failed to get/create project:', error.response?.data || error.message);
    return null;
  }
}

async function testTikaIntegration() {
  try {
    console.log('\n🧪 Testing Tika Service Integration\n');
    
    // Step 1: Authenticate
    const authenticated = await authenticateUser();
    if (!authenticated) return;
    
    // Step 2: Get project
    const projectId = await getProjects();
    if (!projectId) return;
    
    // Step 3: Create test document with PII
    const testContent = `CONFIDENTIAL EMPLOYEE RECORD
=============================

Personal Information:
- Name: Sarah Johnson
- Email: sarah.johnson@techcorp.com
- Phone: +1-555-987-6543
- SSN: 456-78-9123
- Employee ID: TC-2024-001

Emergency Contact:
- Contact Name: Michael Johnson
- Relationship: Spouse
- Phone: +1-555-987-6544
- Address: 789 Oak Street, San Francisco, CA 94102

Financial Information:
- Bank Account: 1234567890
- Credit Card: 4532-1234-5678-9012
- Salary: $95,000

This document contains sensitive personal information and should be handled according to company privacy policies.

Created: January 15, 2024
Last Modified: March 10, 2024
Document ID: HR-2024-003
`;
    
    const testFilePath = '/tmp/test-tika-document.txt';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('📄 Created test document with PII data');
    console.log(`   File size: ${testContent.length} characters`);
    console.log(`   Contains: Email addresses, SSN, phone numbers, credit cards`);
    
    // Step 4: Upload document for processing
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('projectId', projectId);
    form.append('processImmediately', 'true');
    
    console.log('\n📤 Uploading document for PII analysis...');
    
    const uploadResponse = await axios.post(`${API_BASE}/datasets/upload`, form, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        ...form.getHeaders()
      }
    });
    
    const dataset = uploadResponse.data;
    console.log(`✅ Document uploaded successfully`);
    console.log(`   Dataset ID: ${dataset.id}`);
    console.log(`   Status: ${dataset.status}`);
    
    // Step 5: Monitor job progress
    console.log('\n⏳ Monitoring job progress...');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
      try {
        const datasetResponse = await axios.get(`${API_BASE}/datasets/${dataset.id}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const updatedDataset = datasetResponse.data;
        console.log(`   Status: ${updatedDataset.status} (attempt ${attempts + 1}/${maxAttempts})`);
        
        if (updatedDataset.jobs && updatedDataset.jobs.length > 0) {
          updatedDataset.jobs.forEach(job => {
            console.log(`   - Job ${job.type}: ${job.status} (${job.progress}%)`);
          });
        }
        
        if (updatedDataset.status === 'COMPLETED' || updatedDataset.status === 'FAILED') {
          console.log(`\n🎯 Processing completed with status: ${updatedDataset.status}`);
          
          if (updatedDataset.status === 'COMPLETED') {
            // Check for findings
            try {
              const findingsResponse = await axios.get(`${API_BASE}/datasets/${dataset.id}/findings`, {
                headers: { Authorization: `Bearer ${authToken}` }
              });
              
              const findings = findingsResponse.data.findings || [];
              console.log(`\n🔍 PII Analysis Results:`);
              console.log(`   Total findings: ${findings.length}`);
              
              if (findings.length > 0) {
                const entityTypes = [...new Set(findings.map(f => f.entityType))];
                console.log(`   Entity types found: ${entityTypes.join(', ')}`);
                
                findings.slice(0, 5).forEach((finding, index) => {
                  console.log(`   ${index + 1}. ${finding.entityType}: "${finding.text}" (confidence: ${Math.round(finding.confidence * 100)}%)`);
                });
                
                if (findings.length > 5) {
                  console.log(`   ... and ${findings.length - 5} more findings`);
                }
                
                console.log(`\n✅ Tika integration working correctly!`);
                console.log(`   - Document text extraction: SUCCESS`);
                console.log(`   - PII detection: SUCCESS`);
                console.log(`   - Database storage: SUCCESS`);
              } else {
                console.log(`   No PII findings detected (may indicate text extraction issue)`);
              }
            } catch (findingsError) {
              console.log(`   Could not retrieve findings: ${findingsError.message}`);
            }
          }
          
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
      } catch (error) {
        console.error(`   Error checking status: ${error.message}`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️  Processing timeout - check worker service logs');
    }
    
    // Cleanup
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('❌ Tika integration test failed:', error.response?.data || error.message);
  }
}

testTikaIntegration().catch(console.error);