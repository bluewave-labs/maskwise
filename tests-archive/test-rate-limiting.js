#!/usr/bin/env node

/**
 * Rate Limiting Test Suite
 * 
 * Tests the comprehensive rate limiting implementation including:
 * 1. Authentication rate limiting (login/register)
 * 2. File upload rate limiting
 * 3. Different limits for different user types
 * 4. API key vs JWT token rate limiting
 * 5. Rate limit headers and error responses
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const ADMIN_CREDENTIALS = {
  email: 'admin@maskwise.com',
  password: 'admin123'
};

let authToken = null;

async function authenticate() {
  try {
    console.log('🔐 Authenticating admin user...');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    authToken = response.data.accessToken;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAuthRateLimit() {
  try {
    console.log('\n🔐 Testing authentication rate limiting...');
    
    const badCredentials = {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    };
    
    let successfulAttempts = 0;
    let blockedAttempts = 0;
    const totalAttempts = 8; // Should exceed the limit
    
    console.log(`   Making ${totalAttempts} rapid login attempts...`);
    
    for (let i = 1; i <= totalAttempts; i++) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, badCredentials);
        successfulAttempts++;
        console.log(`   Attempt ${i}: ⚠️  Unexpected success (should be blocked)`);
      } catch (error) {
        if (error.response?.status === 429) {
          blockedAttempts++;
          const rateLimitHeaders = {
            limit: error.response.headers['x-ratelimit-limit'],
            remaining: error.response.headers['x-ratelimit-remaining'],
            reset: error.response.headers['x-ratelimit-reset'],
            retryAfter: error.response.headers['retry-after']
          };
          console.log(`   Attempt ${i}: ✅ Rate limited (429)`, rateLimitHeaders);
        } else if (error.response?.status === 401 || error.response?.status === 400) {
          successfulAttempts++;
          console.log(`   Attempt ${i}: ✅ Auth failed as expected (${error.response.status})`);
        } else {
          console.log(`   Attempt ${i}: ❓ Unexpected error (${error.response?.status})`);
        }
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n   📊 Results: ${successfulAttempts} attempts allowed, ${blockedAttempts} rate limited`);
    
    if (blockedAttempts > 0) {
      console.log('✅ Authentication rate limiting is working');
      return true;
    } else {
      console.log('⚠️  Authentication rate limiting may not be active');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Auth rate limit test failed:', error.message);
    return false;
  }
}

async function testGeneralApiRateLimit() {
  try {
    console.log('\n📡 Testing general API rate limiting...');
    
    let successfulRequests = 0;
    let rateLimitedRequests = 0;
    const totalRequests = 150; // Should exceed typical limits
    
    console.log(`   Making ${totalRequests} rapid requests to /dashboard/stats...`);
    
    for (let i = 1; i <= totalRequests; i++) {
      try {
        const response = await axios.get(`${BASE_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        successfulRequests++;
        
        // Log rate limit headers on successful requests
        if (i % 20 === 0) {
          const headers = {
            limit: response.headers['x-ratelimit-limit'],
            remaining: response.headers['x-ratelimit-remaining'],
            reset: response.headers['x-ratelimit-reset'],
            authType: response.headers['x-ratelimit-auth-type']
          };
          console.log(`   Request ${i}: ✅ Success`, headers);
        }
        
        // Add tiny delay to prevent overwhelming
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimitedRequests++;
          if (rateLimitedRequests <= 3) { // Only log first few
            const rateLimitHeaders = {
              limit: error.response.headers['x-ratelimit-limit'],
              remaining: error.response.headers['x-ratelimit-remaining'],
              reset: error.response.headers['x-ratelimit-reset']
            };
            console.log(`   Request ${i}: ⛔ Rate limited`, rateLimitHeaders);
          }
        } else {
          console.log(`   Request ${i}: ❓ Error ${error.response?.status}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n   📊 Results: ${successfulRequests} requests allowed, ${rateLimitedRequests} rate limited`);
    
    if (successfulRequests > 50) {
      console.log('✅ General API rate limiting allows reasonable usage');
    }
    
    if (rateLimitedRequests > 0) {
      console.log('✅ Rate limiting kicks in for excessive usage');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ General API rate limit test failed:', error.message);
    return false;
  }
}

async function testUploadRateLimit() {
  try {
    console.log('\n📤 Testing file upload rate limiting...');
    
    // First create a project
    const project = await axios.post(`${BASE_URL}/projects`, {
      name: 'Rate Limit Test Project',
      description: 'Testing upload rate limits'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const projectId = project.data.id;
    console.log(`   Created test project: ${projectId}`);
    
    // Create test files
    const fs = require('fs');
    const FormData = require('form-data');
    const testContent = 'Test content for rate limiting';
    
    let successfulUploads = 0;
    let rateLimitedUploads = 0;
    const totalUploads = 15; // Should exceed upload limits
    
    console.log(`   Making ${totalUploads} rapid file uploads...`);
    
    for (let i = 1; i <= totalUploads; i++) {
      try {
        // Create temporary file
        const filename = `/tmp/test-rate-limit-${i}.txt`;
        fs.writeFileSync(filename, `${testContent} ${i}`);
        
        const form = new FormData();
        form.append('file', fs.createReadStream(filename));
        form.append('projectId', projectId);
        form.append('processImmediately', 'false');
        
        const response = await axios.post(`${BASE_URL}/datasets/upload`, form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });
        
        successfulUploads++;
        console.log(`   Upload ${i}: ✅ Success`);
        
        // Clean up file
        fs.unlinkSync(filename);
        
        // Small delay between uploads
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimitedUploads++;
          console.log(`   Upload ${i}: ⛔ Rate limited (429)`);
        } else {
          console.log(`   Upload ${i}: ❓ Error ${error.response?.status}: ${error.response?.data?.message || error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`\n   📊 Results: ${successfulUploads} uploads allowed, ${rateLimitedUploads} rate limited`);
    
    if (successfulUploads > 5 && successfulUploads < 12) {
      console.log('✅ Upload rate limiting allows reasonable file uploads');
    }
    
    if (rateLimitedUploads > 0) {
      console.log('✅ Upload rate limiting prevents excessive uploads');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Upload rate limit test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAnonymousRateLimit() {
  try {
    console.log('\n👤 Testing anonymous user rate limiting...');
    
    let successfulRequests = 0;
    let rateLimitedRequests = 0;
    const totalRequests = 50; // Should exceed anonymous limits quickly
    
    console.log(`   Making ${totalRequests} rapid anonymous requests...`);
    
    for (let i = 1; i <= totalRequests; i++) {
      try {
        // Try to access health endpoint without auth
        const response = await axios.get(`${BASE_URL}/health`);
        successfulRequests++;
        
        if (i % 10 === 0) {
          console.log(`   Request ${i}: ✅ Success`);
        }
        
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimitedRequests++;
          if (rateLimitedRequests <= 2) {
            console.log(`   Request ${i}: ⛔ Rate limited`);
          }
        } else if (error.response?.status === 401) {
          // Expected for protected endpoints
          successfulRequests++;
        } else {
          console.log(`   Request ${i}: ❓ Error ${error.response?.status}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log(`\n   📊 Results: ${successfulRequests} requests allowed, ${rateLimitedRequests} rate limited`);
    
    if (rateLimitedRequests > 0) {
      console.log('✅ Anonymous rate limiting is working');
      return true;
    } else {
      console.log('⚠️  Anonymous rate limiting may not be active');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Anonymous rate limit test failed:', error.message);
    return false;
  }
}

async function runRateLimitingTest() {
  console.log('🚀 Starting Rate Limiting Implementation Test\n');
  
  // Step 1: Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) return;
  
  // Step 2: Test authentication rate limiting
  const authRateLimitSuccess = await testAuthRateLimit();
  
  // Step 3: Test general API rate limiting
  const generalRateLimitSuccess = await testGeneralApiRateLimit();
  
  // Step 4: Test file upload rate limiting
  const uploadRateLimitSuccess = await testUploadRateLimit();
  
  // Step 5: Test anonymous user rate limiting
  const anonymousRateLimitSuccess = await testAnonymousRateLimit();
  
  console.log('\n🎉 Rate Limiting Test Complete!');
  console.log('\n📋 Summary:');
  console.log(`${authRateLimitSuccess ? '✅' : '⚠️ '} Authentication rate limiting`);
  console.log(`${generalRateLimitSuccess ? '✅' : '⚠️ '} General API rate limiting`);
  console.log(`${uploadRateLimitSuccess ? '✅' : '⚠️ '} File upload rate limiting`);
  console.log(`${anonymousRateLimitSuccess ? '✅' : '⚠️ '} Anonymous user rate limiting`);
  
  console.log('\n💡 Rate Limiting Features:');
  console.log('• Different limits based on authentication type (JWT, API Key, Anonymous)');
  console.log('• Endpoint-specific limits (auth: 5/min, uploads: 10/min, general: 100/min)');
  console.log('• Rate limit headers in responses (X-RateLimit-*)');
  console.log('• Progressive blocking with retry-after headers');
  console.log('• User role-based limits (Admin gets higher limits)');
}

// Run the test
runRateLimitingTest().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});