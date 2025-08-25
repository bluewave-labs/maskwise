const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function debugQueuedJob() {
  try {
    console.log('🔍 Debug Queued Job Visibility...\n');

    // Step 1: Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@maskwise.com',
      password: 'admin123',
    });

    const token = loginResponse.data.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 2: Check job stats
    console.log('2. Getting job stats...');
    const statsResponse = await axios.get(`${API_BASE}/jobs/stats`, { headers });
    console.log('✅ Job Stats:', statsResponse.data);

    // Step 3: Get all jobs (first page)
    console.log('\n3. Getting jobs list (first 10)...');
    const jobsResponse = await axios.get(`${API_BASE}/jobs?page=1&limit=10`, { headers });
    console.log('✅ Jobs Response:', {
      total: jobsResponse.data.total,
      page: jobsResponse.data.page,
      pages: jobsResponse.data.pages,
      jobCount: jobsResponse.data.data.length
    });

    // Step 4: Look for queued jobs specifically
    console.log('\n4. Analyzing job statuses...');
    const jobs = jobsResponse.data.data;
    const statusCounts = {};
    jobs.forEach(job => {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    });
    console.log('Status counts in first 10 jobs:', statusCounts);

    // Step 5: Search for queued jobs specifically
    console.log('\n5. Searching for QUEUED jobs...');
    const queuedJobsResponse = await axios.get(`${API_BASE}/jobs?status=QUEUED&limit=5`, { headers });
    console.log('✅ QUEUED Jobs Found:', queuedJobsResponse.data.data.length);
    
    if (queuedJobsResponse.data.data.length > 0) {
      console.log('First queued job:', {
        id: queuedJobsResponse.data.data[0].id,
        type: queuedJobsResponse.data.data[0].type,
        status: queuedJobsResponse.data.data[0].status,
        createdAt: queuedJobsResponse.data.data[0].createdAt,
        dataset: queuedJobsResponse.data.data[0].dataset?.name || 'No dataset'
      });
    }

    // Step 6: Get more recent jobs to see if queued job is there
    console.log('\n6. Getting more recent jobs...');
    const recentResponse = await axios.get(`${API_BASE}/jobs?page=1&limit=50`, { headers });
    const allRecentJobs = recentResponse.data.data;
    const queuedInRecent = allRecentJobs.filter(job => job.status === 'QUEUED');
    console.log(`Found ${queuedInRecent.length} queued jobs in recent 50 jobs`);

    if (queuedInRecent.length > 0) {
      queuedInRecent.forEach((job, index) => {
        console.log(`Queued Job ${index + 1}:`, {
          id: job.id,
          type: job.type,
          createdAt: job.createdAt,
          dataset: job.dataset?.name || 'No dataset'
        });
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugQueuedJob();