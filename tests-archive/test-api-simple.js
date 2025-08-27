#!/usr/bin/env node

// Simple API key test using axios
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testApiKeyFlow() {
  try {
    console.log('🚀 Starting Simple API Key Test\n');

    // Step 1: Login
    console.log('📝 Step 1: Admin Login');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });

    const { accessToken } = loginResponse.data;
    console.log('✅ Login successful');

    // Step 2: Generate API Key
    console.log('\n📝 Step 2: Generate API Key');
    const keyResponse = await axios.post(`${API_BASE_URL}/api-keys`, 
      { name: 'Test API Key via Axios' },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const { apiKey, fullKey } = keyResponse.data;
    console.log('✅ API key generated successfully');
    console.log(`   Key ID: ${apiKey.id}`);
    console.log(`   Full Key: ${fullKey.substring(0, 30)}...`);

    // Step 3: Test v1 endpoints
    console.log('\n📝 Step 3: Test v1/projects endpoint');
    const projectsResponse = await axios.get(`${API_BASE_URL}/v1/projects`, {
      headers: {
        'Authorization': `Bearer ${fullKey}`
      }
    });

    console.log('✅ v1/projects endpoint working with API key');
    console.log(`   Projects count: ${projectsResponse.data.length}`);

    // Step 4: Cleanup
    console.log('\n📝 Step 4: Delete test API key');
    await axios.delete(`${API_BASE_URL}/api-keys/${apiKey.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Test API key deleted');

    console.log('\n🎉 API Key Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testApiKeyFlow();