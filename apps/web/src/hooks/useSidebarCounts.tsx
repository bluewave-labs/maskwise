'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface SidebarCounts {
  projects: number;
  datasets: number;
  policies: number;
  jobs: number;
}

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>({
    projects: 0,
    datasets: 0,
    policies: 0,
    jobs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch counts in parallel - use high limit to get total counts
      const [projectsRes, datasetsRes, policiesRes, jobsRes] = await Promise.all([
        api.get('/projects?limit=1000').catch(() => ({ data: [] })),
        api.get('/datasets?limit=1000').catch(() => ({ data: [] })),
        api.get('/policies?limit=1000').catch(() => ({ data: { policies: [] } })),
        api.get('/jobs?limit=1000').catch(() => ({ data: { jobs: [] } })),
      ]);

      setCounts({
        projects: Array.isArray(projectsRes.data) ? projectsRes.data.length : 0,
        datasets: Array.isArray(datasetsRes.data) ? datasetsRes.data.length : 0,
        policies: policiesRes.data?.policies ? policiesRes.data.policies.length : (Array.isArray(policiesRes.data) ? policiesRes.data.length : 0),
        jobs: jobsRes.data?.jobs ? jobsRes.data.jobs.length : (Array.isArray(jobsRes.data) ? jobsRes.data.length : 0),
      });
    } catch (error) {
      console.error('Failed to fetch sidebar counts:', error);
      // Keep counts at 0 on error
    } finally {
      setLoading(false);
    }
  };

  return {
    counts,
    loading,
    refetch: fetchCounts,
  };
}