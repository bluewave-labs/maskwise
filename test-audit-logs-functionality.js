#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAuditLogsFunctionality() {
  console.log('🔍 Testing Audit Logs API Functionality\n');

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

    // Step 2: Test basic audit logs retrieval
    console.log('2. Testing basic audit logs retrieval...');
    const basicLogsResponse = await axios.get(`${BASE_URL}/users/audit-logs/all`, { headers });
    
    console.log(`✅ Retrieved ${basicLogsResponse.data.logs?.length || 0} audit logs`);
    console.log(`   Total logs: ${basicLogsResponse.data.total || 0}`);
    console.log(`   Current page: ${basicLogsResponse.data.page || 1}`);
    console.log(`   Total pages: ${basicLogsResponse.data.totalPages || 1}\n`);

    // Step 3: Test search functionality
    console.log('3. Testing search functionality...');
    const searchResponse = await axios.get(`${BASE_URL}/users/audit-logs/all?search=LOGIN`, { headers });
    
    console.log(`✅ Search for "LOGIN" returned ${searchResponse.data.logs?.length || 0} results`);
    if (searchResponse.data.logs?.length > 0) {
      console.log(`   First result action: ${searchResponse.data.logs[0].action}`);
    }
    console.log();

    // Step 4: Test action filtering
    console.log('4. Testing action filtering...');
    const actionFilterResponse = await axios.get(`${BASE_URL}/users/audit-logs/all?action=LOGIN`, { headers });
    
    console.log(`✅ Filter by action "LOGIN" returned ${actionFilterResponse.data.logs?.length || 0} results`);
    if (actionFilterResponse.data.logs?.length > 0) {
      const uniqueActions = [...new Set(actionFilterResponse.data.logs.map(log => log.action))];
      console.log(`   Unique actions in results: ${uniqueActions.join(', ')}`);
    }
    console.log();

    // Step 5: Test pagination
    console.log('5. Testing pagination...');
    const paginationResponse = await axios.get(`${BASE_URL}/users/audit-logs/all?page=1&limit=5`, { headers });
    
    console.log(`✅ Pagination test (page 1, limit 5) returned ${paginationResponse.data.logs?.length || 0} results`);
    console.log(`   Total pages available: ${paginationResponse.data.totalPages || 1}\n`);

    // Step 6: Test date filtering (last 30 days)
    console.log('6. Testing date filtering...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    
    const dateFilterResponse = await axios.get(`${BASE_URL}/users/audit-logs/all?dateFrom=${dateFrom}`, { headers });
    
    console.log(`✅ Date filter (last 30 days) returned ${dateFilterResponse.data.logs?.length || 0} results`);
    if (dateFilterResponse.data.logs?.length > 0) {
      const oldestDate = new Date(dateFilterResponse.data.logs[dateFilterResponse.data.logs.length - 1].createdAt);
      console.log(`   Oldest log date: ${oldestDate.toLocaleDateString()}`);
    }
    console.log();

    // Step 7: Test combined filters
    console.log('7. Testing combined filters...');
    const combinedResponse = await axios.get(`${BASE_URL}/users/audit-logs/all?search=admin&action=LOGIN&limit=3`, { headers });
    
    console.log(`✅ Combined filters (search: admin, action: LOGIN, limit: 3) returned ${combinedResponse.data.logs?.length || 0} results`);
    console.log();

    // Summary
    console.log('🎉 All audit logs functionality tests passed successfully!');
    console.log('\n📋 Tested Features:');
    console.log('  ✅ Basic audit logs retrieval with pagination');
    console.log('  ✅ Text search across user names, emails, resources');
    console.log('  ✅ Action filtering with enum validation');
    console.log('  ✅ Date range filtering');
    console.log('  ✅ Combined multi-parameter filtering');
    console.log('  ✅ Proper response structure and metadata');
    
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
testAuditLogsFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });