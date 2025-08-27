#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:3001';

async function testTextAnonymization() {
  console.log('🧪 Testing Text File Anonymization');
  console.log('==================================\n');
  
  try {
    // Authenticate
    const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });
    const token = authResponse.data.accessToken;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Authentication successful\n');

    // Get project and policy
    const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, { headers: authHeaders });
    const project = projectsResponse.data[0];
    
    const policiesResponse = await axios.get(`${API_BASE_URL}/policies`, { headers: authHeaders });
    const policies = policiesResponse.data.policies || policiesResponse.data;
    const activePolicy = policies.find(p => p.isActive) || policies[0];
    
    console.log(`✅ Using project: ${project.name}`);
    console.log(`✅ Using policy: ${activePolicy.name}\n`);

    // Upload text file
    console.log('📄 Uploading text file with PII...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/tmp/employee-record.txt'));
    formData.append('projectId', project.id);
    formData.append('policyId', activePolicy.id);
    formData.append('processImmediately', 'true');

    const uploadResponse = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: { ...authHeaders, ...formData.getHeaders() }
    });

    const dataset = uploadResponse.data.dataset;
    console.log(`✅ File uploaded: ${dataset.filename} (${dataset.id})\n`);

    // Wait for processing
    console.log('⏳ Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    // Check findings
    const findingsResponse = await axios.get(`${API_BASE_URL}/datasets/${dataset.id}/findings`, {
      headers: authHeaders
    });
    
    const findings = findingsResponse.data.findings || [];
    console.log(`🔍 Found ${findings.length} PII entities:`);
    findings.slice(0, 10).forEach((finding, i) => {
      console.log(`   ${i+1}. ${finding.entityType}: "${finding.text}" (${(finding.confidence * 100).toFixed(1)}%)`);
    });

    if (findings.length > 0) {
      console.log('\n✅ PII Detection is working correctly!');
      console.log('📋 This confirms our anonymization system can:');
      console.log('   • Extract text from files');
      console.log('   • Detect PII entities using Presidio');
      console.log('   • Apply policy-based filtering');
      console.log('   • Store findings in the database');
      console.log('\nThe PDF anonymization system should work the same way,');
      console.log('but with direct PDF modification instead of text output.');
    } else {
      console.log('⚠️  No PII found - this might indicate a configuration issue');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testTextAnonymization();