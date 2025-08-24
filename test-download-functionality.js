const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test credentials
const TEST_USER = {
  email: 'admin@maskwise.com',
  password: 'admin123'
};

let authToken = '';
let testDatasetId = '';

async function authenticateUser() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    authToken = response.data.access_token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function getCompletedDatasets() {
  try {
    const response = await axios.get(`${API_BASE}/datasets?limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const datasets = response.data.data || response.data.datasets || [];
    const completed = datasets.filter(d => d.status === 'COMPLETED');
    
    console.log(`📊 Found ${datasets.length} total datasets, ${completed.length} completed`);
    
    if (completed.length > 0) {
      testDatasetId = completed[0].id;
      console.log(`✅ Using dataset: ${completed[0].name} (${testDatasetId})`);
      
      // Check if it has anonymization job
      const hasAnonymization = completed[0].jobs?.some(job => 
        job.type === 'ANONYMIZE' && job.status === 'COMPLETED'
      );
      
      console.log(`🔒 Anonymization completed: ${hasAnonymization ? 'Yes' : 'No'}`);
      return hasAnonymization;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Failed to get datasets:', error.response?.data || error.message);
    return false;
  }
}

async function testDownloadEndpoints() {
  const downloadFormats = ['original', 'txt', 'json', 'csv'];
  
  for (const format of downloadFormats) {
    try {
      console.log(`\n📥 Testing download format: ${format}`);
      
      const response = await axios.get(
        `${API_BASE}/datasets/${testDatasetId}/anonymized/download?format=${format}`, 
        {
          headers: { Authorization: `Bearer ${authToken}` },
          responseType: 'blob',  // Important for file downloads
          timeout: 30000
        }
      );
      
      const contentType = response.headers['content-type'];
      const contentLength = response.data.size || response.headers['content-length'];
      const contentDisposition = response.headers['content-disposition'];
      
      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  📄 Content-Type: ${contentType}`);
      console.log(`  📏 Content-Length: ${contentLength} bytes`);
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          const filename = filenameMatch[1].replace(/['"]/g, '');
          console.log(`  📎 Filename: ${filename}`);
        }
      }
      
      // Basic validation
      if (contentLength && contentLength > 0) {
        console.log(`  ✅ Download successful - received ${contentLength} bytes`);
      } else {
        console.log(`  ⚠️  Warning: Download may be empty`);
      }
      
    } catch (error) {
      console.error(`  ❌ Download failed for ${format}:`, 
        error.response?.status, error.response?.data || error.message);
    }
  }
}

async function testAnonymizedContentAPI() {
  try {
    console.log(`\n🔍 Testing anonymized content API...`);
    
    const response = await axios.get(
      `${API_BASE}/datasets/${testDatasetId}/anonymized?format=json`, 
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`  ✅ Content loaded successfully`);
      console.log(`  📊 Operations applied: ${data.operationsApplied}`);
      console.log(`  📏 Original length: ${data.originalLength}`);
      console.log(`  📏 Anonymized length: ${data.anonymizedLength}`);
      console.log(`  🔒 Entity types found: ${[...new Set(data.operations?.map(op => op.entity_type) || [])].length}`);
      return true;
    } else {
      console.log(`  ❌ Failed to load content: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Anonymized content API failed:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Download Functionality\n');
  
  // Step 1: Authenticate
  const authenticated = await authenticateUser();
  if (!authenticated) return;
  
  // Step 2: Get datasets with anonymization
  const hasAnonymizedDatasets = await getCompletedDatasets();
  if (!hasAnonymizedDatasets) {
    console.log('❌ No datasets with completed anonymization found');
    return;
  }
  
  // Step 3: Test anonymized content API
  const contentAvailable = await testAnonymizedContentAPI();
  if (!contentAvailable) {
    console.log('❌ Anonymized content not available via API');
    return;
  }
  
  // Step 4: Test download endpoints
  await testDownloadEndpoints();
  
  console.log('\n🎉 Download functionality testing completed!');
}

main().catch(console.error);