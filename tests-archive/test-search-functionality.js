#!/usr/bin/env node

/**
 * Test Script: Global PII Search Functionality
 * 
 * Tests the new global search endpoint we just implemented.
 * This script validates:
 * 1. Authentication and endpoint access
 * 2. Basic search functionality
 * 3. Entity type filtering
 * 4. Confidence range filtering
 * 5. Pagination and result formatting
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Admin credentials from seeded data
const ADMIN_CREDENTIALS = {
  email: 'admin@maskwise.com',
  password: 'admin123'
};

class SearchTester {
  constructor() {
    this.token = null;
  }

  async login() {
    try {
      console.log('🔐 Authenticating...');
      const response = await axios.post(`${API_BASE}/auth/login`, ADMIN_CREDENTIALS);
      
      this.token = response.data.accessToken;
      console.log('✅ Authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        params
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  async testBasicSearch() {
    console.log('\n📋 Test 1: Basic Search (no filters)');
    
    const result = await this.makeRequest('/datasets/search/findings', { limit: 5 });
    
    if (!result.success) {
      console.error('❌ Basic search failed:', result.error);
      return false;
    }

    const { findings, metadata, pagination, breakdown } = result.data;
    console.log(`✅ Found ${metadata.totalResults} total findings`);
    console.log(`📄 Showing ${findings.length} results on page ${pagination.page}`);
    console.log(`⏱️  Query executed in ${metadata.executionTime}ms`);
    
    if (breakdown.length > 0) {
      console.log('📊 Entity breakdown:');
      breakdown.forEach(item => {
        console.log(`   ${item.entityType}: ${item.count} (avg confidence: ${item.avgConfidence})`);
      });
    }

    return true;
  }

  async testTextSearch() {
    console.log('\n🔍 Test 2: Text Search');
    
    // Search for email-like patterns
    const result = await this.makeRequest('/datasets/search/findings', { 
      query: 'email',
      limit: 3
    });
    
    if (!result.success) {
      console.error('❌ Text search failed:', result.error);
      return false;
    }

    const { findings, metadata } = result.data;
    console.log(`✅ Text search for "email" found ${metadata.totalResults} results`);
    console.log(`⏱️  Query executed in ${metadata.executionTime}ms`);
    
    if (findings.length > 0) {
      console.log('📝 Sample findings:');
      findings.slice(0, 2).forEach((finding, i) => {
        console.log(`   ${i + 1}. ${finding.entityType} (${Math.round(finding.confidence * 100)}%): ${finding.maskedText}`);
        console.log(`      Dataset: ${finding.dataset.name} (${finding.dataset.project.name})`);
      });
    }

    return true;
  }

  async testEntityTypeFilter() {
    console.log('\n🏷️  Test 3: Entity Type Filtering');
    
    const result = await this.makeRequest('/datasets/search/findings', { 
      entityTypes: 'EMAIL_ADDRESS,PHONE_NUMBER',
      limit: 5
    });
    
    if (!result.success) {
      console.error('❌ Entity type filtering failed:', result.error);
      return false;
    }

    const { findings, metadata, breakdown } = result.data;
    console.log(`✅ Entity filter found ${metadata.totalResults} EMAIL/PHONE findings`);
    
    if (breakdown.length > 0) {
      console.log('📊 Filtered breakdown:');
      breakdown.forEach(item => {
        console.log(`   ${item.entityType}: ${item.count} findings`);
      });
    }

    return true;
  }

  async testConfidenceFilter() {
    console.log('\n📊 Test 4: Confidence Range Filtering');
    
    const result = await this.makeRequest('/datasets/search/findings', { 
      minConfidence: 0.8,
      maxConfidence: 1.0,
      limit: 5
    });
    
    if (!result.success) {
      console.error('❌ Confidence filtering failed:', result.error);
      return false;
    }

    const { findings, metadata } = result.data;
    console.log(`✅ High confidence filter (80-100%) found ${metadata.totalResults} results`);
    
    if (findings.length > 0) {
      console.log('🎯 High confidence findings:');
      findings.slice(0, 3).forEach((finding, i) => {
        console.log(`   ${i + 1}. ${finding.entityType} (${Math.round(finding.confidence * 100)}%)`);
      });
    }

    return true;
  }

  async testPagination() {
    console.log('\n📄 Test 5: Pagination');
    
    const result = await this.makeRequest('/datasets/search/findings', { 
      page: 1,
      limit: 3
    });
    
    if (!result.success) {
      console.error('❌ Pagination test failed:', result.error);
      return false;
    }

    const { pagination } = result.data;
    console.log(`✅ Pagination working: Page ${pagination.page} of ${pagination.pages}`);
    console.log(`   Results: ${pagination.limit} per page, ${pagination.total} total`);
    console.log(`   Navigation: hasNext=${pagination.hasNext}, hasPrev=${pagination.hasPrev}`);

    return true;
  }

  async testErrorHandling() {
    console.log('\n⚠️  Test 6: Error Handling');
    
    // Test invalid confidence range
    const result = await this.makeRequest('/datasets/search/findings', { 
      minConfidence: 1.5,  // Invalid > 1
      maxConfidence: 0.5
    });
    
    if (result.success) {
      console.log('⚠️  Expected validation error but search succeeded');
      return false;
    }

    console.log('✅ Error handling working - invalid parameters rejected');
    return true;
  }

  async runAllTests() {
    console.log('🧪 Starting Global PII Search API Tests\n');
    console.log('=' .repeat(50));

    // Authenticate first
    const authSuccess = await this.login();
    if (!authSuccess) {
      console.log('❌ Test suite failed - authentication required');
      process.exit(1);
    }

    // Run all test cases
    const tests = [
      () => this.testBasicSearch(),
      () => this.testTextSearch(),
      () => this.testEntityTypeFilter(),
      () => this.testConfidenceFilter(),
      () => this.testPagination(),
      () => this.testErrorHandling()
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const success = await test();
        if (success) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('❌ Test failed with exception:', error.message);
        failed++;
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed! Global search functionality is working perfectly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the implementation above.');
    }

    return failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SearchTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SearchTester;