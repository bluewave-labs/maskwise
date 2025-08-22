'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { DashboardStats } from '@/types/dashboard';
import { useAuth } from '@/hooks/useAuth';
import { useSmartPolling } from '@/hooks/useSmartPolling';

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  pollingStatus: {
    isActive: boolean;
    isPolling: boolean;
    isPaused: boolean;
    errorCount: number;
  };
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchStats = async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      return;
    }

    try {
      if (!isLoading) setIsLoading(true);
      setError(null);
      const response = await api.get<DashboardStats>('/dashboard/stats');
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      // Only set error if it's not an auth error (which will be handled by auth system)
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard statistics');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Smart polling for dashboard stats - slow refresh since it's less time-sensitive
  const { refresh: manualRefresh, getStatus } = useSmartPolling({
    onPoll: fetchStats,
    isActive: () => {
      // Stop polling if auth is loading or user not authenticated
      if (authLoading || !isAuthenticated) return null;
      
      // Stop polling if there are errors
      if (error) return null;
      
      // Dashboard stats don't need active polling, just slow background updates
      return false; // Always use slow interval for dashboard
    },
    fastInterval: 15000,  // 15 seconds (not used for dashboard)
    slowInterval: 60000,  // 1 minute for dashboard updates
    immediate: true,      // Fetch immediately on mount
    pauseOnHidden: true,  // Pause when tab is hidden
    maxErrors: 3          // Stop after 3 consecutive errors
  });

  const pollingStatus = getStatus();

  return {
    stats,
    isLoading,
    error,
    refetch: manualRefresh,
    pollingStatus
  };
}