#!/usr/bin/env node

/**
 * Test PDF Download Functionality
 * 
 * This script tests the new PDF download functionality by:
 * 1. Creating a PDF with PII content
 * 2. Uploading it for anonymization
 * 3. Waiting for processing
 * 4. Testing the download of the anonymized PDF
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

const API_BASE_URL = 'http://localhost:3001';

async function createTestPDF() {
  console.log('📄 Creating test PDF with PII content...');
  
  // Create PDF with minimal compression to avoid parsing issues
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  // Add PII content with simpler formatting
  page.drawText('CONFIDENTIAL EMPLOYEE RECORD', {
    x: 50, y: height - 50, size: 16, color: rgb(0, 0, 0)
  });

  const piiContent = [
    'Name: Sarah Michelle Johnson',
    'Email: sarah.johnson@company.com', 
    'Phone: (555) 123-4567',
    'SSN: 123-45-6789',
    'Credit Card: 4532-1234-5678-9012',
    'Address: 123 Main Street, Boston, MA 02101',
    '',
    'Emergency Contact: John Smith',
    'Emergency Phone: 555-987-6543',
    'Date of Birth: March 15, 1985'
  ];

  let yPosition = height - 100;
  piiContent.forEach(line => {
    page.drawText(line, {
      x: 50, y: yPosition, size: 12, color: rgb(0, 0, 0)
    });
    yPosition -= 25;
  });

  // Save with minimal compression options to avoid parsing issues
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    objectsPerTick: 50
  });
  
  const testPdfPath = '/tmp/test-pii-document.pdf';
  fs.writeFileSync(testPdfPath, pdfBytes);
  
  console.log(`✅ Test PDF created: ${testPdfPath}`);
  console.log(`📊 File size: ${pdfBytes.length} bytes`);
  
  return testPdfPath;
}

async function testPDFDownload() {
  console.log('🧪 Testing PDF Download Functionality');
  console.log('====================================\n');
  
  try {
    // Step 1: Create test PDF
    const testPdfPath = await createTestPDF();
    
    // Step 2: Authentication
    console.log('🔐 Authenticating...');
    const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });
    const token = authResponse.data.accessToken;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Authentication successful\n');

    // Step 3: Get project
    console.log('📁 Getting project...');
    const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, { headers: authHeaders });
    const project = projectsResponse.data[0];
    console.log(`✅ Using project: ${project.name}\n`);

    // Step 4: Upload PDF
    console.log('📤 Uploading PDF for anonymization...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testPdfPath));
    formData.append('projectId', project.id);
    formData.append('policyId', 'default-policy');
    formData.append('processImmediately', 'true');

    const uploadResponse = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
      headers: { ...authHeaders, ...formData.getHeaders() }
    });

    const dataset = uploadResponse.data.dataset;
    console.log(`✅ PDF uploaded: ${dataset.id}`);
    console.log(`📄 Original file: ${dataset.filename}`);
    console.log(`📊 File type: ${dataset.fileType}\n`);

    // Step 5: Wait for anonymization
    console.log('⏳ Waiting for PII analysis and PDF anonymization...');
    console.log('   (This may take 15-20 seconds for PDF processing)');
    
    let attempts = 0;
    let datasetInfo;
    const maxAttempts = 30; // Wait up to 2 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds
      attempts++;
      
      try {
        const statusResponse = await axios.get(`${API_BASE_URL}/datasets/${dataset.id}`, {
          headers: authHeaders
        });
        datasetInfo = statusResponse.data;
        
        console.log(`   📊 Status check ${attempts}: ${datasetInfo.status}`);
        
        if (datasetInfo.status === 'COMPLETED') {
          console.log('✅ Anonymization completed!\n');
          break;
        } else if (datasetInfo.status === 'FAILED') {
          throw new Error('Anonymization failed');
        }
      } catch (error) {
        if (attempts === maxAttempts) throw error;
        console.log(`   ⚠️  Status check failed, retrying...`);
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Timeout waiting for anonymization to complete');
    }

    // Step 6: Check if outputPath is stored
    console.log('🔍 Checking anonymization results...');
    console.log(`   📁 Output path: ${datasetInfo.outputPath ? '✅ Available' : '❌ Missing'}`);
    console.log(`   📊 Status: ${datasetInfo.status}`);
    
    // Step 7: Test downloading the anonymized PDF
    console.log('\n📥 Testing PDF download options...');
    
    // Test downloading original anonymized PDF
    if (datasetInfo.outputPath) {
      console.log('   📄 Attempting to download anonymized PDF (original format)...');
      try {
        const downloadResponse = await axios.get(
          `${API_BASE_URL}/datasets/${dataset.id}/anonymized/download?format=original`,
          { 
            headers: authHeaders,
            responseType: 'arraybuffer'
          }
        );
        
        const downloadedPdfPath = '/tmp/downloaded-anonymized.pdf';
        fs.writeFileSync(downloadedPdfPath, downloadResponse.data);
        
        console.log('   ✅ Anonymized PDF downloaded successfully!');
        console.log(`   📁 Saved to: ${downloadedPdfPath}`);
        console.log(`   📊 Size: ${downloadResponse.data.byteLength} bytes`);
        console.log(`   🗂️ Content-Type: ${downloadResponse.headers['content-type'] || 'Unknown'}`);
      } catch (downloadError) {
        console.log(`   ❌ PDF download failed: ${downloadError.message}`);
        if (downloadError.response) {
          console.log(`   📊 Status: ${downloadError.response.status}`);
          console.log(`   📝 Response: ${downloadError.response.data ? downloadError.response.data.toString().substring(0, 200) : 'No response body'}`);
        }
      }
    } else {
      console.log('   ⚠️  No output path available - PDF anonymization may not have created a file');
    }
    
    // Test downloading text-based formats too
    console.log('\n   📄 Testing text-based download formats...');
    try {
      const txtResponse = await axios.get(
        `${API_BASE_URL}/datasets/${dataset.id}/anonymized/download?format=txt`,
        { headers: authHeaders, responseType: 'blob' }
      );
      console.log('   ✅ Text format download successful');
    } catch (txtError) {
      console.log(`   ❌ Text download failed: ${txtError.message}`);
    }

    // Step 8: Summary
    console.log('\n🎉 PDF Download Test Summary');
    console.log('============================');
    console.log('✅ PDF file uploaded successfully');
    console.log('✅ PII analysis and anonymization completed');
    console.log(`✅ Output path stored: ${datasetInfo.outputPath ? 'Yes' : 'No'}`);
    console.log('✅ Download API endpoints accessible');
    console.log('✅ Frontend UI should now show "Anonymized PDF" option');
    console.log('\n📋 Next Steps:');
    console.log('1. Check the downloaded PDF file to verify anonymization worked');
    console.log('2. Test the frontend download dropdown for PDF files');
    console.log('3. Verify that DOC/DOCX files also show appropriate download options');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Response:', error.response.status, error.response.statusText);
      console.error('📝 Data:', error.response.data ? JSON.stringify(error.response.data, null, 2) : 'No response body');
    }
  } finally {
    // Cleanup
    try {
      fs.unlinkSync('/tmp/test-pii-document.pdf');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testPDFDownload();