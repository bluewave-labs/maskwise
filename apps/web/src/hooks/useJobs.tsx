'use client';

import { useState, useEffect } from 'react';
import { api as apiClient } from '@/lib/api';

export interface Job {
  id: string;
  type: 'FILE_PROCESSING' | 'TEXT_EXTRACTION' | 'PII_ANALYSIS' | 'ANONYMIZATION';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: number;
  progress: number;
  error?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  dataset?: {
    id: string;
    name: string;
    filename: string;
  };
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  policy?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, any>;
}

export interface JobStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface JobFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  datasetId?: string;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  pages: number;
}

export function useJobs(filters: JobFilters = {}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats>({
    total: 0,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.datasetId) params.append('datasetId', filters.datasetId);

      const [jobsResponse, statsResponse] = await Promise.all([
        apiClient.get<JobsResponse>(`/jobs?${params}`),
        apiClient.get<JobStats>('/jobs/stats'),
      ]);


      setJobs(jobsResponse.data.data || []);
      setStats(statsResponse.data || {
        total: 0,
        queued: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      });
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      await apiClient.post(`/jobs/${jobId}/retry`);
      // Refresh jobs after retry
      await fetchJobs();
      return { success: true };
    } catch (err: any) {
      console.error('Error retrying job:', err);
      return { success: false, error: err.message || 'Failed to retry job' };
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      await apiClient.post(`/jobs/${jobId}/cancel`);
      // Refresh jobs after cancellation
      await fetchJobs();
      return { success: true };
    } catch (err: any) {
      console.error('Error cancelling job:', err);
      return { success: false, error: err.message || 'Failed to cancel job' };
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filters.page, filters.limit, filters.status, filters.type, filters.datasetId]);

  return {
    jobs,
    stats,
    loading,
    error,
    refetch: fetchJobs,
    retryJob,
    cancelJob,
  };
}