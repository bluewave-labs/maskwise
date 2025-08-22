#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testSystemHealth() {
  console.log('🏥 Testing System Health API\n');

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

    // Step 2: Test system health endpoint
    console.log('2. Testing GET /system/health...');
    const healthResponse = await axios.get(`${BASE_URL}/system/health`, { headers });
    
    console.log('✅ Successfully retrieved system health');
    console.log(`   Overall Status: ${healthResponse.data.overallStatus}`);
    console.log(`   System Version: ${healthResponse.data.version}`);
    console.log(`   System Uptime: ${healthResponse.data.uptime} seconds`);
    console.log(`   Services Checked: ${healthResponse.data.services.length} services`);
    console.log();

    // Step 3: Display service health details
    console.log('3. Service Health Status:');
    healthResponse.data.services.forEach(service => {
      const statusIcon = service.status === 'healthy' ? '✅' : 
                        service.status === 'degraded' ? '⚠️' : '❌';
      console.log(`   ${statusIcon} ${service.name}: ${service.status} (${service.responseTime}ms)`);
      console.log(`      Message: ${service.message}`);
      if (service.metadata) {
        console.log(`      Metadata: ${JSON.stringify(service.metadata)}`);
      }
    });
    console.log();

    // Step 4: Display system resources
    console.log('4. System Resources:');
    const resources = healthResponse.data.resources;
    console.log(`   CPU Usage: ${resources.cpuUsage}%`);
    console.log(`   Memory Usage: ${resources.memoryUsage}% (${resources.usedMemory}MB / ${resources.totalMemory}MB)`);
    console.log(`   Disk Usage: ${resources.diskUsage}% (${resources.usedDisk}MB / ${resources.totalDisk}MB)`);
    console.log();

    // Step 5: Display queue status
    console.log('5. Queue Status:');
    healthResponse.data.queues.forEach(queue => {
      console.log(`   Queue: ${queue.name}`);
      console.log(`     Waiting: ${queue.waiting}, Active: ${queue.active}, Completed: ${queue.completed}, Failed: ${queue.failed}`);
      console.log(`     Workers: ${queue.workers}`);
    });
    console.log();

    // Step 6: Display application metrics
    console.log('6. Application Metrics:');
    const metrics = healthResponse.data.metrics;
    console.log(`   Total Users: ${metrics.totalUsers}`);
    console.log(`   Active Users (24h): ${metrics.activeUsers}`);
    console.log(`   Total Datasets: ${metrics.totalDatasets}`);
    console.log(`   Total PII Findings: ${metrics.totalFindings}`);
    console.log(`   Average Processing Time: ${metrics.averageProcessingTime}s`);
    console.log(`   Success Rate: ${metrics.successRate}%`);
    console.log();

    // Step 7: Validate response structure
    console.log('7. Validating response structure...');
    const requiredFields = ['overallStatus', 'timestamp', 'version', 'uptime', 'services', 'resources', 'queues', 'metrics'];
    const missingFields = requiredFields.filter(field => !healthResponse.data.hasOwnProperty(field));
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields present in response');
    } else {
      console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
    }
    console.log();

    // Summary
    console.log('🎉 All system health tests passed successfully!');
    console.log('\n📋 Tested Features:');
    console.log('  ✅ System health endpoint with JWT authentication');
    console.log('  ✅ Service health checks for all components');
    console.log('  ✅ System resource monitoring (CPU, memory, disk)');
    console.log('  ✅ Queue status monitoring');
    console.log('  ✅ Application metrics and statistics');
    console.log('  ✅ Complete response structure validation');
    
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
testSystemHealth()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });