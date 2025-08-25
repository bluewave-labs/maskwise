const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testMemberRole() {
  console.log('🧪 Testing Member Role Restrictions...\n');
  
  try {
    // Step 1: Login as member
    console.log('1️⃣ Logging in as member...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'member@maskwise.com',
      password: 'member123'
    });
    
    const memberToken = loginResponse.data.accessToken;
    const memberUser = loginResponse.data.user;
    console.log(`✅ Member login successful: ${memberUser.email} (Role: ${memberUser.role})`);
    
    const memberHeaders = { Authorization: `Bearer ${memberToken}` };
    
    // Step 2: Test what member CAN access (should work)
    console.log('\n2️⃣ Testing member READ access (should work)...');
    
    try {
      // Dashboard stats
      const dashboardResponse = await axios.get(`${API_BASE}/dashboard/stats`, { headers: memberHeaders });
      console.log('✅ Dashboard stats: ACCESSIBLE');
      
      // Datasets list
      const datasetsResponse = await axios.get(`${API_BASE}/datasets`, { headers: memberHeaders });
      console.log('✅ Datasets list: ACCESSIBLE');
      
      // Projects list
      const projectsResponse = await axios.get(`${API_BASE}/projects`, { headers: memberHeaders });
      console.log('✅ Projects list: ACCESSIBLE');
      
      // Policies list
      const policiesResponse = await axios.get(`${API_BASE}/policies`, { headers: memberHeaders });
      console.log('✅ Policies list: ACCESSIBLE');
      
    } catch (error) {
      console.log(`❌ Unexpected error accessing read-only endpoint: ${error.response?.status}`);
    }
    
    // Step 3: Test what member CANNOT access (should fail)
    console.log('\n3️⃣ Testing member WRITE access (should be blocked)...');
    
    const restrictedEndpoints = [
      { method: 'post', url: '/datasets/upload', description: 'Dataset upload', data: { projectId: 'test' } },
      { method: 'post', url: '/projects', description: 'Project creation', data: { name: 'test', description: 'test' } },
      { method: 'post', url: '/policies', description: 'Policy creation', data: { name: 'test' } },
      { method: 'post', url: '/users', description: 'User creation', data: { email: 'test@test.com', password: 'test123', firstName: 'Test', lastName: 'User' } },
      { method: 'get', url: '/users', description: 'Users list (admin only)' },
      { method: 'get', url: '/users/audit-logs/all', description: 'All audit logs (admin only)' }
    ];
    
    for (const endpoint of restrictedEndpoints) {
      try {
        let response;
        if (endpoint.method === 'post') {
          response = await axios.post(`${API_BASE}${endpoint.url}`, endpoint.data, { headers: memberHeaders });
          console.log(`❌ ${endpoint.description}: UNEXPECTED ACCESS (should be blocked)`);
        } else {
          response = await axios.get(`${API_BASE}${endpoint.url}`, { headers: memberHeaders });
          console.log(`❌ ${endpoint.description}: UNEXPECTED ACCESS (should be blocked)`);
        }
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(`✅ ${endpoint.description}: BLOCKED (403 Forbidden) ✓`);
        } else {
          console.log(`⚠️ ${endpoint.description}: Unexpected error (${error.response?.status})`);
        }
      }
    }
    
    // Step 4: Compare with admin access
    console.log('\n4️⃣ Comparing with admin access...');
    
    const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });
    
    const adminToken = adminLoginResponse.data.accessToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    // Test admin can access restricted endpoints
    try {
      const adminProjectsResponse = await axios.post(`${API_BASE}/projects`, {
        name: 'Test Admin Project',
        description: 'Created by admin to test access'
      }, { headers: adminHeaders });
      console.log('✅ Admin can create projects ✓');
      
      // Clean up the test project
      const projectId = adminProjectsResponse.data.id;
      await axios.delete(`${API_BASE}/projects/${projectId}`, { headers: adminHeaders });
      console.log('✅ Admin can delete projects ✓');
      
      const adminUsersResponse = await axios.get(`${API_BASE}/users`, { headers: adminHeaders });
      console.log('✅ Admin can list users ✓');
      
    } catch (error) {
      console.log(`❌ Admin access test failed: ${error.response?.status}`);
    }
    
    console.log('\n🎉 Member role testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testMemberRole();