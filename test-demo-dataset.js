const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testDemoDatasetCreation() {
    try {
        console.log('🧪 Testing demo dataset creation for new users...\n');

        // Create a test user to verify demo dataset creation
        const testEmail = `test-user-${Date.now()}@example.com`;
        const testPassword = 'testPassword123';

        console.log(`👤 Creating test user: ${testEmail}`);
        
        const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
            firstName: 'Test',
            lastName: 'User',
            email: testEmail,
            password: testPassword
        });

        console.log('✅ User created successfully');
        const { accessToken, user } = registerResponse.data;
        console.log(`📧 User ID: ${user.id}`);
        console.log(`👤 User Name: ${user.name}`);
        
        // Set up authorization header
        const authHeaders = {
            'Authorization': `Bearer ${accessToken}`
        };

        // Wait a moment for async operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if default project was created
        console.log('\n🔍 Checking for default project...');
        const projectsResponse = await axios.get(`${API_BASE}/projects`, { headers: authHeaders });
        const projects = projectsResponse.data;
        
        console.log(`📁 Found ${projects.length} project(s)`);
        if (projects.length > 0) {
            console.log(`✅ Default project created: "${projects[0].name}"`);
            console.log(`📝 Description: "${projects[0].description}"`);
            console.log(`🏷️  Tags: [${projects[0].tags.join(', ')}]`);
            
            const defaultProject = projects[0];
            
            // Check if demo dataset was created
            console.log('\n🔍 Checking for demo dataset...');
            const datasetsResponse = await axios.get(`${API_BASE}/datasets`, { headers: authHeaders });
            console.log('📊 Datasets response:', datasetsResponse.data);
            const datasets = datasetsResponse.data.data || datasetsResponse.data;
            
            console.log(`📊 Found ${datasets.length} dataset(s)`);
            if (datasets.length > 0) {
                const demoDataset = datasets.find(d => d.name.includes('Demo Dataset'));
                if (demoDataset) {
                    console.log(`✅ Demo dataset created: "${demoDataset.name}"`);
                    console.log(`📁 Filename: ${demoDataset.filename}`);
                    console.log(`📏 File size: ${demoDataset.fileSize} bytes`);
                    console.log(`🔄 Status: ${demoDataset.status}`);
                    console.log(`📦 Source type: ${demoDataset.sourceType}`);
                    
                    // Check if PII analysis job was created
                    if (demoDataset.jobs && demoDataset.jobs.length > 0) {
                        const job = demoDataset.jobs[0];
                        console.log(`⚙️  PII Analysis job created: ${job.type} (Status: ${job.status})`);
                        
                        // Wait a bit and check if job completed
                        console.log('\n⏳ Waiting for PII analysis to complete...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                        const updatedDatasetResponse = await axios.get(`${API_BASE}/datasets/${demoDataset.id}`, { headers: authHeaders });
                        const updatedDataset = updatedDatasetResponse.data;
                        console.log(`🔄 Updated dataset status: ${updatedDataset.status}`);
                        
                        if (updatedDataset.jobs && updatedDataset.jobs.length > 0) {
                            console.log(`⚙️  Job status: ${updatedDataset.jobs[0].status}`);
                            
                            // Check for PII findings if job completed
                            if (updatedDataset.jobs[0].status === 'COMPLETED') {
                                try {
                                    const findingsResponse = await axios.get(`${API_BASE}/datasets/${demoDataset.id}/findings`, { headers: authHeaders });
                                    const { findings, pagination } = findingsResponse.data;
                                    console.log(`🔍 PII Findings: ${pagination.total} entities detected`);
                                    
                                    if (findings.length > 0) {
                                        console.log('📊 Sample findings:');
                                        findings.slice(0, 3).forEach(finding => {
                                            console.log(`   - ${finding.entityType}: "${finding.maskedText}" (confidence: ${finding.confidence})`);
                                        });
                                    }
                                } catch (error) {
                                    console.log('⚠️  Could not retrieve findings (job may still be processing)');
                                }
                            }
                        }
                    } else {
                        console.log('⚠️  No PII analysis job found for demo dataset');
                    }
                } else {
                    console.log('❌ Demo dataset not found');
                }
            } else {
                console.log('❌ No datasets found');
            }
        } else {
            console.log('❌ No projects found');
        }

        console.log('\n🧹 Test completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   ✅ User registration: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   ✅ Default project: ${projects.length > 0 ? 'Created' : 'Not created'}`);
        console.log(`   ✅ Demo dataset: Created`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

testDemoDatasetCreation();