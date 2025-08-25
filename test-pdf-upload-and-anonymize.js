#!/usr/bin/env node

/**
 * Test PDF Upload and Anonymization with Sample PDF
 * 
 * Creates a sample PDF with PII content, uploads it, processes it,
 * and downloads the anonymized PDF to demonstrate the workflow.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

// Create a simple PDF with PII content using a more complete PDF structure
const createSamplePDF = () => {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 380
>>
stream
BT
/F1 12 Tf
50 750 Td
(CONFIDENTIAL EMPLOYEE RECORD) Tj
0 -30 Td
(=============================) Tj
0 -40 Td
(Name: John Michael Smith) Tj
0 -20 Td
(Email: john.smith@company.com) Tj
0 -20 Td
(Phone: +1-555-123-4567) Tj
0 -20 Td
(SSN: 123-45-6789) Tj
0 -20 Td
(Credit Card: 4532-1234-5678-9012) Tj
0 -20 Td
(Address: 123 Main Street, New York, NY 10001) Tj
0 -40 Td
(Emergency Contact: Sarah Johnson) Tj
0 -20 Td
(Emergency Email: sarah.johnson@email.com) Tj
0 -20 Td
(Emergency Phone: 555-987-6543) Tj
0 -40 Td
(Date of Birth: January 15, 1985) Tj
0 -20 Td
(Employee ID: EMP-2024-001) Tj
0 -20 Td
(Department: Human Resources) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000251 00000 n 
0000000329 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
760
%%EOF`;
  
  return Buffer.from(pdfContent, 'utf8');
};

async function testPDFUploadAndAnonymization() {
  console.log('🧪 Testing Complete PDF Anonymization Workflow');
  console.log('==============================================\n');
  
  try {
    // Step 1: Authenticate
    console.log('1️⃣ Authenticating with admin credentials...');
    const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });
    
    if (!authResponse.data.accessToken) {
      throw new Error('Authentication failed');
    }
    
    const token = authResponse.data.accessToken;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Authentication successful\n');

    // Step 2: Get or create a project
    console.log('2️⃣ Setting up test project...');
    const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, { headers: authHeaders });
    
    let project;
    if (projectsResponse.data.length > 0) {
      project = projectsResponse.data[0];
      console.log(`✅ Using existing project: ${project.name} (${project.id})`);
    } else {
      const createProjectResponse = await axios.post(`${API_BASE_URL}/projects`, {
        name: 'PDF Anonymization Test',
        description: 'Testing PDF anonymization with sample data'
      }, { headers: authHeaders });
      project = createProjectResponse.data;
      console.log(`✅ Created new project: ${project.name} (${project.id})`);
    }
    console.log();

    // Step 3: Get active policy
    console.log('3️⃣ Getting anonymization policy...');
    const policiesResponse = await axios.get(`${API_BASE_URL}/policies`, { headers: authHeaders });
    
    // Handle the policies response structure
    const policies = policiesResponse.data.policies || policiesResponse.data;
    
    if (!policies || !Array.isArray(policies)) {
      throw new Error(`Invalid policies response format: ${JSON.stringify(policiesResponse.data)}`);
    }
    
    if (policies.length === 0) {
      throw new Error('No policies available. Please create a policy first.');
    }
    
    const activePolicy = policies.find(p => p.isActive) || policies[0];
    console.log(`✅ Using policy: ${activePolicy.name} (${activePolicy.id})`);
    console.log(`   Policy status: ${activePolicy.isActive ? 'Active' : 'Inactive'}\n`);

    // Step 4: Create sample PDF with PII
    console.log('4️⃣ Creating sample PDF with PII content...');
    const pdfBuffer = createSamplePDF();
    const testPdfPath = '/tmp/sample-employee-record.pdf';
    fs.writeFileSync(testPdfPath, pdfBuffer);
    
    const fileSize = fs.statSync(testPdfPath).size;
    console.log(`✅ Sample PDF created: ${testPdfPath}`);
    console.log(`   File size: ${fileSize} bytes`);
    console.log('   Content: Employee record with multiple PII types\n');

    // Step 5: Upload PDF file
    console.log('5️⃣ Uploading PDF for analysis...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testPdfPath));
    formData.append('projectId', project.id);
    formData.append('policyId', activePolicy.id);
    formData.append('processImmediately', 'true');

    const uploadResponse = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: {
        ...authHeaders,
        ...formData.getHeaders()
      }
    });

    const dataset = uploadResponse.data.dataset;
    console.log(`✅ PDF uploaded successfully!`);
    console.log(`   Dataset ID: ${dataset.id}`);
    console.log(`   Filename: ${dataset.filename}`);
    console.log(`   File type: ${dataset.fileType}`);
    console.log(`   Size: ${dataset.fileSize} bytes\n`);

    // Step 6: Monitor processing progress
    console.log('6️⃣ Monitoring PII analysis and anonymization...');
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    let lastJobStatus = {};

    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;

      try {
        const datasetResponse = await axios.get(`${API_BASE_URL}/datasets/${dataset.id}`, { 
          headers: authHeaders 
        });
        
        const currentDataset = datasetResponse.data;
        const jobs = currentDataset.jobs || [];
        
        if (jobs.length > 0) {
          const latestJob = jobs[jobs.length - 1];
          
          // Only log if status changed
          const jobKey = `${latestJob.type}-${latestJob.status}-${latestJob.progress}`;
          if (lastJobStatus[latestJob.type] !== jobKey) {
            console.log(`   📊 ${latestJob.type}: ${latestJob.status} (${latestJob.progress}%) - ${latestJob.statusMessage || ''}`);
            lastJobStatus[latestJob.type] = jobKey;
          }
          
          // Check if all jobs are completed
          const completedJobs = jobs.filter(job => job.status === 'COMPLETED');
          const failedJobs = jobs.filter(job => job.status === 'FAILED');
          
          if (failedJobs.length > 0) {
            const failedJob = failedJobs[0];
            throw new Error(`Job failed: ${failedJob.statusMessage || 'Unknown error'}`);
          }
          
          // Consider processing complete if we have both PII analysis and anonymization completed
          const hasAnalysisCompleted = completedJobs.some(job => job.type === 'pii-analysis');
          const hasAnonymizationCompleted = completedJobs.some(job => job.type === 'anonymization');
          
          if (hasAnalysisCompleted && hasAnonymizationCompleted) {
            processingComplete = true;
          }
        }
      } catch (error) {
        console.log(`   ⏳ Attempt ${attempts}: ${error.message}`);
      }
    }

    if (!processingComplete) {
      console.log('⚠️  Processing timed out, but continuing to check results...\n');
    } else {
      console.log('✅ All processing completed!\n');
    }

    // Step 7: Check PII findings
    console.log('7️⃣ Checking PII detection results...');
    try {
      const findingsResponse = await axios.get(`${API_BASE_URL}/datasets/${dataset.id}/findings`, {
        headers: authHeaders
      });

      const findings = findingsResponse.data.findings || [];
      console.log(`✅ PII Detection Results: ${findings.length} entities found`);
      
      if (findings.length > 0) {
        const entityTypes = [...new Set(findings.map(f => f.entityType))];
        console.log(`   Entity types detected: ${entityTypes.join(', ')}`);
        
        findings.slice(0, 5).forEach((finding, index) => {
          console.log(`   ${index + 1}. ${finding.entityType}: "${finding.text}" (${(finding.confidence * 100).toFixed(1)}% confidence)`);
        });
        
        if (findings.length > 5) {
          console.log(`   ... and ${findings.length - 5} more findings`);
        }
      }
      console.log();
    } catch (findingsError) {
      console.log(`⚠️  Could not retrieve findings: ${findingsError.message}\n`);
    }

    // Step 8: Download anonymized PDF
    console.log('8️⃣ Downloading anonymized PDF...');
    try {
      const anonymizedResponse = await axios.get(`${API_BASE_URL}/datasets/${dataset.id}/anonymized/download`, {
        headers: authHeaders,
        responseType: 'arraybuffer'
      });

      const outputPath = '/tmp/anonymized-employee-record.pdf';
      fs.writeFileSync(outputPath, anonymizedResponse.data);
      
      const anonymizedSize = fs.statSync(outputPath).size;
      const fileHeader = fs.readFileSync(outputPath, { start: 0, end: 10 }).toString();
      
      console.log(`✅ Anonymized PDF downloaded successfully!`);
      console.log(`   📄 Original file: ${testPdfPath} (${fileSize} bytes)`);
      console.log(`   🔒 Anonymized file: ${outputPath} (${anonymizedSize} bytes)`);
      console.log(`   🔍 File signature: "${fileHeader}"`);
      
      // Verify it's a valid PDF
      if (fileHeader.startsWith('%PDF')) {
        console.log('✅ Output is a valid PDF file format');
        
        // Read a bit more to see if our redaction metadata is there
        const pdfContent = fs.readFileSync(outputPath, 'utf8');
        if (pdfContent.includes('Maskwise')) {
          console.log('✅ PDF contains Maskwise anonymization metadata');
        }
        
      } else {
        console.log('⚠️  Output may not be a valid PDF format');
      }
      
      console.log('\n🎉 SUCCESS! You can now examine the anonymized PDF:');
      console.log(`   Original PDF: ${testPdfPath}`);
      console.log(`   Anonymized PDF: ${outputPath}`);
      console.log('\n   The anonymized PDF should contain:');
      console.log('   • Redaction boxes over PII content');
      console.log('   • Anonymization metadata in PDF properties');
      console.log('   • Original document structure preserved');
      
    } catch (downloadError) {
      console.error(`❌ Failed to download anonymized PDF: ${downloadError.message}`);
      
      if (downloadError.response) {
        console.error('Response status:', downloadError.response.status);
        if (downloadError.response.data) {
          const errorText = Buffer.isBuffer(downloadError.response.data) 
            ? downloadError.response.data.toString()
            : downloadError.response.data;
          console.error('Response data:', errorText);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Don't exit so we can still see any generated files
    console.log('\n⚠️  Test failed, but you can check for any generated files in /tmp/');
  }
}

// Run the test
testPDFUploadAndAnonymization().catch(console.error);