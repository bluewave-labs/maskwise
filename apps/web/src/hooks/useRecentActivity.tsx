'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AuditLog } from '@/types/audit';
import { useAuth } from '@/hooks/useAuth';

interface UseRecentActivityReturn {
  activities: AuditLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRecentActivity(limit: number = 10): UseRecentActivityReturn {
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchActivities = async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<{logs: AuditLog[], total: number, page: number, totalPages: number}>(`/users/audit-logs/all?limit=${limit}&page=1`);
      setActivities(response.data.logs || []);
    } catch (err: any) {
      console.error('Failed to fetch recent activity:', err);
      // Only set error if it's not an auth error (which will be handled by auth system)
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch recent activity');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch when authenticated and auth is not loading
    if (!authLoading && isAuthenticated) {
      fetchActivities();
    }
  }, [limit, isAuthenticated]); // Re-fetch when auth state or limit changes

  return {
    activities,
    isLoading,
    error,
    refetch: fetchActivities,
  };
}