#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testYamlValidation() {
  try {
    const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });
    const token = authResponse.data.accessToken;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    const testYaml = `name: test-policy
version: 1.0.0
description: Test policy for validation
detection:
  entities:
    - type: EMAIL_ADDRESS
      confidence_threshold: 0.5
      action: redact
    - type: SSN
      confidence_threshold: 0.8
      action: redact
scope:
  file_types:
    - txt
    - csv
    - pdf
  max_file_size: 100MB
anonymization:
  default_action: redact
  preserve_format: true
  audit_trail: true`;

    console.log('Testing YAML validation...');
    console.log('YAML Content:');
    console.log(testYaml);
    console.log('\n');

    const response = await axios.post(`${API_BASE_URL}/policies/validate`, {
      yamlContent: testYaml
    }, { headers: authHeaders });

    console.log('✅ YAML validation response:', response.data);

  } catch (error) {
    console.error('❌ YAML validation failed:', error.response?.data || error.message);
  }
}

testYamlValidation();