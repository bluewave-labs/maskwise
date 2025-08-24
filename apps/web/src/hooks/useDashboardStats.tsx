'use client';

import api from '@/lib/api';
import { DashboardStats } from '@/types/dashboard';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundRefreshWithMount } from '@/hooks/useBackgroundRefresh';

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isRefreshing: boolean;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Background refresh for dashboard stats
  const {
    data: stats,
    isLoading,
    error,
    isRefreshing,
    refresh
  } = useBackgroundRefreshWithMount<DashboardStats>({
    fetchFn: async () => {
      // Don't fetch if auth is still loading or user is not authenticated
      if (authLoading || !isAuthenticated) {
        throw new Error('Not authenticated');
      }

      const response = await api.get<DashboardStats>('/dashboard/stats');
      return response.data;
    },
    shouldPoll: () => {
      // Dashboard stats don't need active polling, just slow background updates
      return false; // Always use inactive interval
    },
    activeInterval: 30000,   // 30 seconds (not used for dashboard)
    inactiveInterval: 300000, // 5 minutes for dashboard updates
    onError: (err: any) => {
      console.error('Failed to fetch dashboard stats:', err);
      // Don't log auth errors as they're expected when not authenticated
      if (err.response?.status !== 401 && err.message !== 'Not authenticated') {
        console.error('Dashboard stats error:', err);
      }
    }
  });

  return {
    stats,
    isLoading,
    error: error && error !== 'Not authenticated' ? error : null,
    refetch: refresh,
    isRefreshing
  };
}