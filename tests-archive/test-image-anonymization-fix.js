#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testImageAnonymization() {
  try {
    console.log('🚀 Testing Image Anonymization Fix');
    console.log('======================================');
    
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/auth/login', {
      email: 'admin@maskwise.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful');
    
    // Step 2: Get projects
    const projectsResponse = await axios.get('http://localhost:3001/projects', { headers });
    const project = projectsResponse.data[0];
    console.log(`📁 Using project: ${project.name}`);
    
    // Step 3: Get policies  
    const policiesResponse = await axios.get('http://localhost:3001/policies', { headers });
    const policy = policiesResponse.data.policies.find(p => p.isActive) || policiesResponse.data.policies[0];
    console.log(`📋 Using policy: ${policy.name}`);
    
    // Step 4: Upload PNG file
    console.log('📤 Uploading PNG file...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/tmp/test-pii-document.png'));
    formData.append('projectId', project.id);
    formData.append('policyId', policy.id);
    formData.append('processImmediately', 'true');
    
    const uploadResponse = await axios.post('http://localhost:3001/datasets/upload', formData, {
      headers: { ...headers, ...formData.getHeaders() }
    });
    
    const datasetId = uploadResponse.data.datasetId;
    console.log(`✅ File uploaded: Dataset ID ${datasetId}`);
    
    // Step 5: Wait for processing to complete
    console.log('⏳ Waiting for anonymization to complete...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
      
      try {
        const datasetResponse = await axios.get(`http://localhost:3001/datasets/${datasetId}`, { headers });
        const dataset = datasetResponse.data;
        
        console.log(`📊 Status check [${attempts}/${maxAttempts}]: ${dataset.status}`);
        
        if (dataset.status === 'COMPLETED') {
          completed = true;
          
          // Check if anonymization job exists and is completed
          const jobsResponse = await axios.get(`http://localhost:3001/datasets`, {
            headers,
            params: { limit: 100 }
          });
          
          const allDatasets = jobsResponse.data.data;
          const targetDataset = allDatasets.find(d => d.id === datasetId);
          
          if (targetDataset && targetDataset.jobs) {
            const anonymizeJob = targetDataset.jobs.find(j => j.type === 'ANONYMIZE');
            if (anonymizeJob && anonymizeJob.status === 'COMPLETED') {
              console.log('✅ Both PII analysis and anonymization completed!');
              
              // Check the output files in storage
              console.log('\n📂 Checking anonymized output...');
              
              // Try to find the anonymized file
              const { exec } = require('child_process');
              const util = require('util');
              const execAsync = util.promisify(exec);
              
              try {
                const { stdout } = await execAsync('find ./storage/anonymized -name "*' + datasetId + '*" -type f');
                const files = stdout.trim().split('\n').filter(f => f);
                
                if (files.length > 0) {
                  console.log(`✅ Found ${files.length} anonymized file(s):`);
                  
                  for (const file of files) {
                    console.log(`   📄 ${file}`);
                    
                    // Check file content
                    try {
                      const content = fs.readFileSync(file, 'utf-8');
                      const parsed = JSON.parse(content);
                      
                      console.log(`   📝 File type: ${parsed.reportType || 'STANDARD'}`);
                      console.log(`   📊 Original file: ${parsed.originalFile?.name || 'N/A'} (${parsed.originalFile?.type || 'N/A'})`);
                      console.log(`   🔍 PII operations: ${parsed.anonymizationSummary?.operationsApplied || parsed.operationsApplied || 0}`);
                      
                      if (parsed.reportType === 'IMAGE_ANONYMIZATION_REPORT') {
                        console.log('   🎉 SUCCESS: PNG file now generates proper JSON report instead of plain text!');
                        console.log(`   📋 Entities processed: ${parsed.anonymizationSummary?.piiEntitiesProcessed?.join(', ') || 'None'}`);
                        console.log(`   💾 Report includes original file reference and anonymized extracted text`);
                      } else {
                        console.log('   ℹ️  Standard text anonymization output');
                      }
                    } catch (parseError) {
                      console.log(`   ❌ Could not parse file as JSON: ${parseError.message}`);
                    }
                  }
                } else {
                  console.log('❌ No anonymized files found');
                }
              } catch (findError) {
                console.log(`❌ Error finding files: ${findError.message}`);
              }
              
            } else {
              console.log('⏳ Anonymization still in progress...');
              completed = false;
            }
          }
        }
      } catch (error) {
        console.log(`❌ Error checking status: ${error.message}`);
      }
    }
    
    if (!completed) {
      console.log('❌ Processing did not complete in time');
    }
    
    console.log('\n🧹 Cleaning up test data...');
    try {
      await axios.delete(`http://localhost:3001/datasets/${datasetId}`, { headers });
      console.log('✅ Test dataset deleted');
    } catch (error) {
      console.log(`❌ Cleanup failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testImageAnonymization();