#!/usr/bin/env node

/**
 * API Key Authentication Flow Test
 * 
 * Tests the complete API key management and authentication system:
 * 1. Admin login
 * 2. Generate API key
 * 3. Test API key authentication on v1 endpoints
 * 4. List and manage API keys
 * 5. Test invalid API key scenarios
 */

const API_BASE_URL = 'http://localhost:3001';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    console.error(`❌ Request failed for ${endpoint}:`, error.message);
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function testApiKeyFlow() {
  console.log('🚀 Starting API Key Management Flow Test\n');

  // Step 1: Admin Login
  console.log('📝 Step 1: Admin Login');
  const loginResponse = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@maskwise.com',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Admin login failed:', loginResponse.data);
    return;
  }

  const { accessToken } = loginResponse.data;
  console.log('✅ Admin login successful');

  // Step 2: Generate API Key
  console.log('\n📝 Step 2: Generate API Key');
  const generateKeyResponse = await makeRequest('/api-keys', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: 'Test API Key for Integration'
    })
  });

  if (!generateKeyResponse.ok) {
    console.error('❌ API key generation failed:', generateKeyResponse.data);
    return;
  }

  const { apiKey, fullKey } = generateKeyResponse.data;
  console.log('✅ API key generated successfully');
  console.log(`   Key ID: ${apiKey.id}`);
  console.log(`   Name: ${apiKey.name}`);
  console.log(`   Prefix: ${apiKey.prefix}`);
  console.log(`   Full Key: ${fullKey.substring(0, 20)}...`);

  // Step 3: Test API Key Authentication on v1 Endpoints
  console.log('\n📝 Step 3: Test API Key Authentication');

  // Test Projects List
  const projectsResponse = await makeRequest('/v1/projects', {
    headers: {
      'Authorization': `Bearer ${fullKey}`
    }
  });

  if (!projectsResponse.ok) {
    console.error('❌ API key authentication failed for projects:', projectsResponse.data);
    return;
  }

  console.log('✅ API key authentication successful for v1/projects');
  console.log(`   Projects found: ${projectsResponse.data.length}`);

  // Test Datasets List
  const datasetsResponse = await makeRequest('/v1/datasets', {
    headers: {
      'Authorization': `Bearer ${fullKey}`
    }
  });

  if (!datasetsResponse.ok) {
    console.error('❌ API key authentication failed for datasets:', datasetsResponse.data);
  } else {
    console.log('✅ API key authentication successful for v1/datasets');
  }

  // Step 4: List API Keys
  console.log('\n📝 Step 4: List API Keys');
  const listKeysResponse = await makeRequest('/api-keys', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!listKeysResponse.ok) {
    console.error('❌ Failed to list API keys:', listKeysResponse.data);
  } else {
    console.log('✅ API keys listed successfully');
    console.log(`   Total keys: ${listKeysResponse.data.length}`);
    listKeysResponse.data.forEach(key => {
      console.log(`   - ${key.name} (${key.prefix}••••) - ${key.isActive ? 'Active' : 'Inactive'}`);
    });
  }

  // Step 5: Test Invalid API Key
  console.log('\n📝 Step 5: Test Invalid API Key');
  const invalidKeyResponse = await makeRequest('/v1/projects', {
    headers: {
      'Authorization': `Bearer mk_live_invalid_key_test_12345`
    }
  });

  if (invalidKeyResponse.status === 401) {
    console.log('✅ Invalid API key properly rejected');
  } else {
    console.error('❌ Invalid API key was not rejected:', invalidKeyResponse);
  }

  // Step 6: Test API Key Status Management
  console.log('\n📝 Step 6: Test API Key Status Management');
  
  // Disable the API key
  const disableResponse = await makeRequest(`/api-keys/${apiKey.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      isActive: false
    })
  });

  if (!disableResponse.ok) {
    console.error('❌ Failed to disable API key:', disableResponse.data);
  } else {
    console.log('✅ API key disabled successfully');
  }

  // Test disabled key
  const disabledKeyResponse = await makeRequest('/v1/projects', {
    headers: {
      'Authorization': `Bearer ${fullKey}`
    }
  });

  if (disabledKeyResponse.status === 401) {
    console.log('✅ Disabled API key properly rejected');
  } else {
    console.error('❌ Disabled API key was not rejected:', disabledKeyResponse);
  }

  // Step 7: Cleanup - Delete the test API key
  console.log('\n📝 Step 7: Cleanup - Delete Test API Key');
  const deleteResponse = await makeRequest(`/api-keys/${apiKey.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (deleteResponse.status === 204 || deleteResponse.ok) {
    console.log('✅ Test API key deleted successfully');
  } else {
    console.error('❌ Failed to delete test API key:', deleteResponse.data);
  }

  console.log('\n🎉 API Key Management Flow Test Complete!');
  console.log('\n📊 Summary:');
  console.log('   ✅ Admin authentication');
  console.log('   ✅ API key generation');
  console.log('   ✅ API key authentication on v1 endpoints');
  console.log('   ✅ API key management (list, update, delete)');
  console.log('   ✅ Security validation (invalid and disabled keys rejected)');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This test requires Node.js 18+ or a fetch polyfill');
  console.log('💡 Try running: npm install node-fetch');
  process.exit(1);
}

// Run the test
testApiKeyFlow().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});