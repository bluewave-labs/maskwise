#!/usr/bin/env node

/**
 * OCR Integration Test with Real Image File
 * 
 * Tests the complete OCR pipeline using an actual PNG image with PII text
 * to validate Tesseract OCR integration end-to-end.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';
let authToken = null;

// Test configuration
const TEST_CONFIG = {
  credentials: {
    email: 'admin@maskwise.com',
    password: 'admin123'
  },
  timeout: 180000, // 3 minutes for OCR processing
  expectedEntities: ['EMAIL_ADDRESS', 'PHONE_NUMBER', 'PERSON', 'CREDIT_CARD', 'SSN'], // Expected in image
  imageFilePath: '/tmp/test-pii-document.png'
};

/**
 * Authenticate with the API
 */
async function authenticate() {
  try {
    console.log('🔐 Authenticating with API...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CONFIG.credentials, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    authToken = response.data.accessToken;
    console.log('✅ Authentication successful');
    return true;
    
  } catch (error) {
    console.error('❌ Authentication failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return false;
  }
}

/**
 * Get or create a test project
 */
async function getTestProject() {
  try {
    console.log('📁 Setting up test project...');
    
    // List existing projects
    const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      timeout: 10000
    });
    
    // Use existing project or create new one
    let project = projectsResponse.data.find(p => p.name.includes('OCR Image Test'));
    
    if (!project) {
      const createResponse = await axios.post(`${API_BASE_URL}/projects`, {
        name: 'OCR Image Test Project',
        description: 'Testing OCR integration with real image files containing PII'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      project = createResponse.data;
      console.log('✅ Created new test project:', project.id);
    } else {
      console.log('✅ Using existing test project:', project.id);
    }
    
    return project;
    
  } catch (error) {
    console.error('❌ Project setup failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
}

/**
 * Upload real image file for OCR processing
 */
async function uploadImageFile(project, imagePath) {
  try {
    console.log('📤 Uploading image file for OCR processing...');
    console.log('🖼️  Image file:', imagePath);
    
    // Verify image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const stats = fs.statSync(imagePath);
    console.log('📏 Image file size:', (stats.size / 1024).toFixed(1), 'KB');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));
    formData.append('projectId', project.id);
    formData.append('processImmediately', 'true');
    
    // Get first available policy
    const policiesResponse = await axios.get(`${API_BASE_URL}/policies`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      timeout: 10000
    });
    
    const policiesData = policiesResponse.data?.policies || policiesResponse.data?.data || policiesResponse.data;
    console.log('📋 Available policies count:', policiesData?.length || 0);
    
    if (!policiesData || !Array.isArray(policiesData) || policiesData.length === 0) {
      throw new Error('No policies available for testing');
    }
    
    const activePolicy = policiesData.find(p => p.isActive) || policiesData[0];
    console.log('📋 Using policy:', activePolicy.id, activePolicy.name);
    formData.append('policyId', activePolicy.id);
    
    const response = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      },
      timeout: TEST_CONFIG.timeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const dataset = response.data.dataset;
    const job = response.data.job;
    
    console.log('✅ Image file uploaded successfully:', {
      datasetId: dataset.id,
      filename: dataset.filename,
      fileType: dataset.fileType,
      jobId: job.id,
      jobStatus: job.status
    });
    
    return { dataset, job };
    
  } catch (error) {
    console.error('❌ Image file upload failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    throw error;
  }
}

/**
 * Monitor OCR processing with detailed progress tracking
 */
async function monitorOCRProcessing(datasetId) {
  console.log('⏳ Monitoring OCR processing...');
  
  const maxAttempts = 36; // 3 minutes with 5-second intervals
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      const response = await axios.get(`${API_BASE_URL}/datasets/${datasetId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        timeout: 10000
      });
      
      const dataset = response.data;
      const job = dataset.jobs?.[0];
      
      console.log(`📊 Processing status [${attempt + 1}/${maxAttempts}]:`, {
        jobStatus: job?.status,
        datasetStatus: dataset.status,
        extractionMethod: dataset.extractionMethod,
        extractionConfidence: dataset.extractionConfidence,
        hasOCRMetadata: !!dataset.ocrMetadata
      });
      
      // Check if processing completed
      if (job?.status === 'COMPLETED' && dataset.status === 'COMPLETED') {
        console.log('✅ OCR processing completed successfully!');
        
        // Log OCR-specific metadata
        if (dataset.ocrMetadata) {
          console.log('🔍 OCR Quality Metadata:', {
            imageFormat: dataset.ocrMetadata.imageFormat,
            wordsDetected: dataset.ocrMetadata.wordsDetected,
            averageWordConfidence: dataset.ocrMetadata.averageWordConfidence,
            lowConfidenceWords: dataset.ocrMetadata.lowConfidenceWords,
            processingTimeMs: dataset.ocrMetadata.processingTimeMs
          });
        }
        
        // Log extraction details
        console.log('📄 Text Extraction Results:', {
          method: dataset.extractionMethod,
          confidence: dataset.extractionConfidence,
          expectedMethod: 'ocr' // Should be OCR for image files
        });
        
        return dataset;
      }
      
      // Check for job failure
      if (job?.status === 'FAILED') {
        console.error('❌ OCR processing failed:', job.error || 'Unknown error');
        
        // Still return the dataset to analyze what went wrong
        return dataset;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempt++;
      
    } catch (error) {
      console.error(`❌ Error checking processing status:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempt++;
    }
  }
  
  throw new Error('OCR processing timed out after 3 minutes');
}

/**
 * Analyze PII findings from OCR extraction with detailed reporting
 */
async function analyzePIIFindings(datasetId) {
  try {
    console.log('🔍 Analyzing PII findings from OCR extraction...');
    
    const response = await axios.get(`${API_BASE_URL}/datasets/${datasetId}/findings`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { limit: 100 },
      timeout: 10000
    });
    
    const findings = response.data.findings;
    
    console.log('📈 OCR PII Analysis Results:', {
      totalFindings: findings.length,
      entityTypes: [...new Set(findings.map(f => f.entityType))],
      averageConfidence: findings.length > 0 
        ? (findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length).toFixed(2)
        : 0
    });
    
    // Group findings by entity type
    const entityGroups = findings.reduce((groups, finding) => {
      if (!groups[finding.entityType]) {
        groups[finding.entityType] = [];
      }
      groups[finding.entityType].push(finding);
      return groups;
    }, {});
    
    // Display findings by type with OCR context
    Object.entries(entityGroups).forEach(([entityType, entityFindings]) => {
      console.log(`\n📋 ${entityType} (${entityFindings.length} found):`);
      entityFindings.forEach((finding, index) => {
        console.log(`  ${index + 1}. Text: "${finding.text}" (Confidence: ${(finding.confidence * 100).toFixed(1)}%)`);
        if (finding.contextBefore || finding.contextAfter) {
          console.log(`     Context: ...${finding.contextBefore}[${entityType}]${finding.contextAfter}...`);
        }
      });
    });
    
    // Validate expected entities
    const foundEntityTypes = new Set(findings.map(f => f.entityType));
    const expectedFound = TEST_CONFIG.expectedEntities.filter(e => foundEntityTypes.has(e));
    const expectedMissing = TEST_CONFIG.expectedEntities.filter(e => !foundEntityTypes.has(e));
    
    console.log('\n🎯 Expected Entity Validation:');
    console.log('  Found:', expectedFound.join(', ') || 'None');
    if (expectedMissing.length > 0) {
      console.log('  Missing:', expectedMissing.join(', '));
    }
    
    return findings;
    
  } catch (error) {
    console.error('❌ Failed to analyze PII findings:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
}

/**
 * Cleanup test data
 */
async function cleanup(datasetId) {
  try {
    console.log('🧹 Cleaning up test data...');
    
    if (datasetId) {
      await axios.delete(`${API_BASE_URL}/datasets/${datasetId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        timeout: 10000
      });
      console.log('✅ Test dataset cleaned up');
    }
    
  } catch (error) {
    console.log('⚠️  Cleanup warning (non-critical):', error.message);
  }
}

/**
 * Main OCR image test execution
 */
async function runOCRImageTest() {
  const testStartTime = Date.now();
  let datasetId = null;
  
  try {
    console.log('🚀 Starting OCR Integration Test with Real Image');
    console.log('=' .repeat(60));
    
    // Step 1: Authentication
    const authenticated = await authenticate();
    if (!authenticated) {
      throw new Error('Authentication failed');
    }
    
    // Step 2: Verify test image exists
    if (!fs.existsSync(TEST_CONFIG.imageFilePath)) {
      throw new Error(`Test image not found: ${TEST_CONFIG.imageFilePath}`);
    }
    
    console.log('🖼️  Test image found:', TEST_CONFIG.imageFilePath);
    
    // Step 3: Project setup
    const project = await getTestProject();
    
    // Step 4: Upload image file
    const { dataset, job } = await uploadImageFile(project, TEST_CONFIG.imageFilePath);
    datasetId = dataset.id;
    
    // Step 5: Monitor OCR processing
    const completedDataset = await monitorOCRProcessing(datasetId);
    
    // Step 6: Analyze results
    const findings = await analyzePIIFindings(datasetId);
    
    // Step 7: Test validation
    const testDuration = Date.now() - testStartTime;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 OCR Image Test COMPLETED!');
    console.log('📊 Test Summary:', {
      duration: `${(testDuration / 1000).toFixed(1)}s`,
      extractionMethod: completedDataset.extractionMethod,
      extractionConfidence: completedDataset.extractionConfidence,
      ocrProcessed: !!completedDataset.ocrMetadata,
      piiDetected: findings.length,
      entityTypes: [...new Set(findings.map(f => f.entityType))],
      qualityLevel: completedDataset.extractionConfidence >= 0.8 ? 'HIGH' : 
                   completedDataset.extractionConfidence >= 0.6 ? 'MEDIUM' : 'LOW'
    });
    
    // Validate OCR-specific test results
    const testSuccess = (
      completedDataset.status === 'COMPLETED' &&
      completedDataset.extractionMethod === 'ocr' && // Should be OCR for image files
      completedDataset.extractionConfidence !== null &&
      completedDataset.extractionConfidence >= 0.6 && // Meets confidence threshold
      findings.length > 0 // Should detect PII in the image
    );
    
    if (testSuccess) {
      console.log('✅ All OCR test validations passed!');
      return { success: true, findings, dataset: completedDataset };
    } else {
      console.log('❌ Some OCR test validations failed');
      if (completedDataset.extractionMethod !== 'ocr') {
        console.log('  - Expected extraction method "ocr", got:', completedDataset.extractionMethod);
      }
      if (completedDataset.extractionConfidence < 0.6) {
        console.log('  - OCR confidence below threshold:', completedDataset.extractionConfidence);
      }
      if (findings.length === 0) {
        console.log('  - No PII detected in image');
      }
      return { success: false, findings, dataset: completedDataset };
    }
    
  } catch (error) {
    console.error('\n❌ OCR Image Test FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
    
  } finally {
    // Cleanup
    if (datasetId) {
      await cleanup(datasetId);
    }
    
    console.log('\n🏁 OCR image test execution completed');
  }
}

// Run the test
if (require.main === module) {
  runOCRImageTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled test error:', error);
      process.exit(1);
    });
}

module.exports = { runOCRImageTest };