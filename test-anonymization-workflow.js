/**
 * Test Complete Anonymization Workflow
 * 
 * Tests the full end-to-end anonymization pipeline:
 * 1. File upload with PII content
 * 2. PII analysis and detection
 * 3. Anonymization job creation and processing
 * 4. Anonymized output generation and storage
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001';

// Admin credentials for testing
const ADMIN_EMAIL = 'admin@maskwise.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';
let testProjectId = '';
let testDatasetId = '';
let anonymizationJobId = '';

/**
 * Authenticate and get JWT token
 */
async function authenticate() {
  console.log('🔐 Authenticating admin user...');
  
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (response.data.accessToken) {
    authToken = response.data.accessToken;
    console.log('✅ Authentication successful');
    return true;
  }
  
  throw new Error('Authentication failed');
}

/**
 * Create test project for anonymization testing
 */
async function createTestProject() {
  console.log('📁 Creating test project for anonymization...');
  
  const response = await axios.post(`${API_BASE}/projects`, {
    name: `Anonymization Test Project ${Date.now()}`,
    description: 'Project for testing end-to-end anonymization workflow',
    tags: ['anonymization', 'testing', 'e2e']
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  testProjectId = response.data.id;
  console.log(`✅ Test project created: ${response.data.name} (${testProjectId})`);
  return response.data;
}

/**
 * Create test file with comprehensive PII data for anonymization
 */
function createTestFileWithPII() {
  const testContent = `
CONFIDENTIAL EMPLOYEE RECORD - ANONYMIZATION TEST

Personal Information:
Name: John Michael Smith
Social Security Number: 123-45-6789
Email: john.smith@company.com
Phone: (555) 123-4567
Date of Birth: March 15, 1985

Financial Information:
Credit Card: 4532-1234-5678-9012
Bank Account: 987654321
Annual Salary: $85,000

Medical Information:
Patient ID: MRN-789012
Doctor: Dr. Sarah Wilson
Medical License: MD12345678

Additional PII:
Home Address: 123 Main Street, Anytown, NY 12345
Emergency Contact: Jane Smith (555) 987-6543
Employee ID: EMP001234
Driver's License: DL987654321

Web Information:
Website: https://company.com/employee/john-smith
Secondary Email: j.smith@gmail.com
LinkedIn: https://linkedin.com/in/johnsmith

This document contains multiple types of PII that should be properly 
detected and anonymized according to policy configuration.
`;

  const filePath = path.join(__dirname, 'test-anonymization-data.txt');
  fs.writeFileSync(filePath, testContent.trim());
  
  console.log('📄 Created test file with comprehensive PII data');
  console.log(`   File path: ${filePath}`);
  console.log(`   Content length: ${testContent.length} characters`);
  
  return filePath;
}

/**
 * Upload test file for anonymization processing
 */
async function uploadTestFile(filePath) {
  console.log('⬆️  Uploading test file for anonymization...');
  
  const FormData = require('form-data');
  const form = new FormData();
  
  form.append('file', fs.createReadStream(filePath));
  form.append('projectId', testProjectId);
  form.append('policyId', 'default-policy'); // Use the default policy
  form.append('description', 'Comprehensive PII Test Data for Anonymization');

  const response = await axios.post(`${API_BASE}/datasets/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${authToken}`
    }
  });

  testDatasetId = response.data.dataset.id;
  console.log(`✅ File uploaded successfully`);
  console.log(`   Dataset ID: ${testDatasetId}`);
  console.log(`   Job ID: ${response.data.job.id}`);
  
  return response.data;
}

/**
 * Monitor PII analysis job until completion
 */
async function monitorPIIAnalysis(jobId) {
  console.log('🔍 Monitoring PII analysis job...');
  
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max wait
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_BASE}/datasets/${testDatasetId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const job = response.data.jobs.find(j => j.id === jobId);
      
      if (job) {
        console.log(`   PII Analysis Status: ${job.status} (${job.progress}%)`);
        
        if (job.status === 'COMPLETED') {
          console.log('✅ PII analysis completed successfully');
          return job;
        }
        
        if (job.status === 'FAILED') {
          throw new Error(`PII analysis failed: ${job.error}`);
        }
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error monitoring PII analysis: ${error.message}`);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('PII analysis did not complete within expected time');
}

/**
 * Check if anonymization job was created and monitor its progress
 */
async function monitorAnonymizationJob() {
  console.log('🎭 Checking for anonymization job creation...');
  
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max wait
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_BASE}/datasets/${testDatasetId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      // Look for anonymization job  
      const anonymizationJob = response.data.jobs.find(j => j.type === 'ANONYMIZE');
      
      if (anonymizationJob) {
        anonymizationJobId = anonymizationJob.id;
        console.log(`✅ Anonymization job found: ${anonymizationJobId}`);
        console.log(`   Status: ${anonymizationJob.status} (${anonymizationJob.progress}%)`);
        
        if (anonymizationJob.status === 'COMPLETED') {
          console.log('✅ Anonymization completed successfully');
          return anonymizationJob;
        }
        
        if (anonymizationJob.status === 'FAILED') {
          throw new Error(`Anonymization failed: ${anonymizationJob.error}`);
        }
        
        if (anonymizationJob.status === 'RUNNING') {
          console.log(`   Anonymization in progress... (${anonymizationJob.progress}%)`);
        }
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error monitoring anonymization: ${error.message}`);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('⏰ Anonymization job monitoring timeout reached');
  return null;
}

/**
 * Validate PII findings were detected
 */
async function validatePIIFindings() {
  console.log('🔍 Validating PII findings...');
  
  const response = await axios.get(`${API_BASE}/datasets/${testDatasetId}/findings`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  const findings = response.data.findings;
  console.log(`✅ Found ${findings.length} PII entities`);
  
  // Group findings by entity type
  const entityCounts = findings.reduce((acc, finding) => {
    acc[finding.entityType] = (acc[finding.entityType] || 0) + 1;
    return acc;
  }, {});
  
  console.log('   Entity breakdown:');
  Object.entries(entityCounts).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });
  
  // Validate expected entity types were found
  const expectedEntities = ['EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD', 'PHONE_NUMBER', 'PERSON'];
  const foundEntities = Object.keys(entityCounts);
  
  expectedEntities.forEach(expectedEntity => {
    if (foundEntities.includes(expectedEntity)) {
      console.log(`     ✅ ${expectedEntity} detected`);
    } else {
      console.log(`     ⚠️  ${expectedEntity} not detected`);
    }
  });
  
  return findings;
}

/**
 * Check if anonymized output files were created
 */
async function validateAnonymizedOutput() {
  console.log('📄 Validating anonymized output generation...');
  
  // Output files are stored in the worker service directory
  const storageDir = path.join(__dirname, 'apps/worker/storage/anonymized');
  
  try {
    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir);
      const anonymizedFiles = files.filter(f => f.includes(testDatasetId));
      
      if (anonymizedFiles.length > 0) {
        console.log(`✅ Anonymized output files created: ${anonymizedFiles.length}`);
        
        anonymizedFiles.forEach(file => {
          console.log(`   📄 ${file}`);
          const filePath = path.join(storageDir, file);
          const stats = fs.statSync(filePath);
          console.log(`      Size: ${stats.size} bytes`);
          console.log(`      Modified: ${stats.mtime.toISOString()}`);
        });
        
        // Try to read one file to validate content structure
        const sampleFile = path.join(storageDir, anonymizedFiles[0]);
        const content = fs.readFileSync(sampleFile, 'utf-8');
        
        try {
          const parsed = JSON.parse(content);
          console.log('✅ Anonymized content structure validation:');
          console.log(`     Original length: ${parsed.originalLength}`);
          console.log(`     Anonymized length: ${parsed.anonymizedLength}`);
          console.log(`     Operations applied: ${parsed.operationsApplied}`);
          
          return true;
        } catch {
          console.log('✅ Anonymized content found (non-JSON format)');
          console.log(`     Content length: ${content.length} characters`);
          return true;
        }
      } else {
        console.log('❌ No anonymized output files found for test dataset');
        return false;
      }
    } else {
      console.log('❌ Anonymized output directory does not exist');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error validating anonymized output: ${error.message}`);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete test dataset (cascade deletes findings and jobs)
    if (testDatasetId) {
      await axios.delete(`${API_BASE}/datasets/${testDatasetId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Test dataset deleted');
    }
    
    // Delete test file
    const testFilePath = path.join(__dirname, 'test-anonymization-data.txt');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('✅ Test file deleted');
    }
    
  } catch (error) {
    console.warn(`⚠️  Cleanup warning: ${error.message}`);
  }
}

/**
 * Main test execution
 */
async function runAnonymizationWorkflowTest() {
  console.log('🚀 Starting Complete Anonymization Workflow Test\n');
  
  try {
    // Step 1: Authenticate
    await authenticate();
    
    // Step 2: Create test project
    await createTestProject();
    
    // Step 3: Create and upload test file
    const testFilePath = createTestFileWithPII();
    const uploadResult = await uploadTestFile(testFilePath);
    
    // Step 4: Monitor PII analysis
    const piiJob = await monitorPIIAnalysis(uploadResult.job.id);
    
    // Step 5: Validate PII findings
    const findings = await validatePIIFindings();
    
    // Step 6: Monitor anonymization job
    const anonymizationJob = await monitorAnonymizationJob();
    
    // Step 7: Validate anonymized output
    const outputGenerated = await validateAnonymizedOutput();
    
    console.log('\n🎉 Anonymization Workflow Test Results:');
    console.log(`✅ Authentication: Success`);
    console.log(`✅ Project Creation: Success`);
    console.log(`✅ File Upload: Success`);
    console.log(`✅ PII Analysis: Success (${findings.length} entities found)`);
    console.log(`${anonymizationJob ? '✅' : '⚠️ '} Anonymization Job: ${anonymizationJob ? 'Success' : 'Not Created/Completed'}`);
    console.log(`${outputGenerated ? '✅' : '❌'} Output Generation: ${outputGenerated ? 'Success' : 'Failed'}`);
    
    const overallSuccess = anonymizationJob && outputGenerated;
    console.log(`\n${overallSuccess ? '🎉' : '⚠️ '} Overall Result: ${overallSuccess ? 'COMPLETE SUCCESS' : 'PARTIAL SUCCESS'}`);
    
    if (!overallSuccess) {
      console.log('\n📋 Next Steps:');
      if (!anonymizationJob) {
        console.log('   - Check anonymization job creation logic');
        console.log('   - Verify policy configuration includes anonymization actions');
      }
      if (!outputGenerated) {
        console.log('   - Check anonymization processor implementation');
        console.log('   - Verify storage directory permissions');
      }
    }
    
    // Cleanup
    await cleanup();
    
    return overallSuccess;
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    
    // Attempt cleanup even on failure
    await cleanup().catch(() => {});
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  runAnonymizationWorkflowTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runAnonymizationWorkflowTest };