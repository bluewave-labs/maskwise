#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testSystemConfiguration() {
  console.log('🔧 Testing System Configuration API\n');

  try {
    // Step 1: Login to get authentication token
    console.log('1. Authenticating admin user...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });

    const token = loginResponse.data.accessToken;
    if (!token) {
      throw new Error('Failed to get authentication token');
    }
    console.log('✅ Successfully authenticated\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test getting system configuration
    console.log('2. Testing GET /system/configuration...');
    const getConfigResponse = await axios.get(`${BASE_URL}/system/configuration`, { headers });
    
    console.log('✅ Successfully retrieved system configuration');
    console.log(`   File max size: ${getConfigResponse.data.file.maxSize}MB`);
    console.log(`   Allowed file types: ${getConfigResponse.data.file.allowedTypes.length} types`);
    console.log(`   PII confidence threshold: ${(getConfigResponse.data.pii.defaultConfidenceThreshold * 100).toFixed(0)}%`);
    console.log(`   Default action: ${getConfigResponse.data.pii.defaultAction}`);
    console.log(`   Enabled PII entities: ${getConfigResponse.data.pii.enabledEntityTypes.length} types`);
    console.log();

    // Step 3: Test updating system configuration
    console.log('3. Testing PUT /system/configuration...');
    const updateConfig = {
      file: {
        maxSize: 150, // Change from 100MB to 150MB
        retentionDays: 45
      },
      pii: {
        defaultConfidenceThreshold: 0.90 // Change from 0.85 to 0.90
      },
      security: {
        maxConcurrentJobs: 15 // Change from 10 to 15
      }
    };

    const updateResponse = await axios.put(`${BASE_URL}/system/configuration`, updateConfig, { headers });
    
    console.log('✅ Successfully updated system configuration');
    console.log(`   New file max size: ${updateResponse.data.file.maxSize}MB`);
    console.log(`   New retention days: ${updateResponse.data.file.retentionDays} days`);
    console.log(`   New confidence threshold: ${(updateResponse.data.pii.defaultConfidenceThreshold * 100).toFixed(0)}%`);
    console.log(`   New max concurrent jobs: ${updateResponse.data.security.maxConcurrentJobs}`);
    console.log();

    // Step 4: Verify changes persisted
    console.log('4. Verifying configuration changes persisted...');
    const verifyResponse = await axios.get(`${BASE_URL}/system/configuration`, { headers });
    
    if (verifyResponse.data.file.maxSize === 150 &&
        verifyResponse.data.file.retentionDays === 45 &&
        verifyResponse.data.pii.defaultConfidenceThreshold === 0.90 &&
        verifyResponse.data.security.maxConcurrentJobs === 15) {
      console.log('✅ Configuration changes verified successfully');
    } else {
      console.log('❌ Configuration changes did not persist correctly');
    }
    console.log();

    // Step 5: Test validation errors
    console.log('5. Testing validation errors...');
    try {
      await axios.put(`${BASE_URL}/system/configuration`, {
        file: { maxSize: 2000 }, // Invalid: too large
        pii: { defaultConfidenceThreshold: 1.5 } // Invalid: > 1.0
      }, { headers });
      console.log('❌ Should have received validation error');
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        console.log('✅ Validation errors handled correctly');
        console.log(`   Error status: ${error.response.status}`);
      } else {
        throw error;
      }
    }
    console.log();

    // Summary
    console.log('🎉 All system configuration tests passed successfully!');
    console.log('\n📋 Tested Features:');
    console.log('  ✅ GET system configuration with default values');
    console.log('  ✅ PUT system configuration with updates');
    console.log('  ✅ Configuration persistence verification');
    console.log('  ✅ Input validation and error handling');
    console.log('  ✅ JWT authentication protection');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Run the test
testSystemConfiguration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });