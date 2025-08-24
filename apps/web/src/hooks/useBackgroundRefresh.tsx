'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface UseBackgroundRefreshOptions<T> {
  /** Function to fetch data */
  fetchFn: () => Promise<T>;
  /** Function to determine if data needs active polling */
  shouldPoll?: (data: T | null) => boolean;
  /** Active polling interval in ms (default: 5000) */
  activeInterval?: number;
  /** Inactive polling interval in ms (default: 30000) */
  inactiveInterval?: number;
  /** Function to handle errors */
  onError?: (error: any) => void;
  /** Function called on successful data update */
  onSuccess?: (data: T) => void;
}

interface UseBackgroundRefreshReturn<T> {
  /** Current data */
  data: T | null;
  /** Loading state (only true on initial load) */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Whether background refresh is active */
  isRefreshing: boolean;
  /** Manually refresh data */
  refresh: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
}

export function useBackgroundRefresh<T>({
  fetchFn,
  shouldPoll = () => false,
  activeInterval = 5000,
  inactiveInterval = 30000,
  onError,
  onSuccess
}: UseBackgroundRefreshOptions<T>): UseBackgroundRefreshReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    // Track if this call should show refreshing state
    // Show refreshing for: background polls OR manual refreshes (but not initial load)
    const shouldShowRefreshing = !isInitialLoadRef.current;
    
    try {
      // Only show loading spinner on initial load
      if (isInitialLoadRef.current) {
        setIsLoading(true);
      } else if (shouldShowRefreshing) {
        // Show refreshing indicator for all non-initial loads
        setIsRefreshing(true);
      }

      setError(null);
      const result = await fetchFn();
      setData(result);
      
      // Mark initial load as complete
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setIsLoading(false);
      }

      onSuccess?.(result);
      
      // Schedule next poll based on data state
      scheduleNextPoll(result);
      
    } catch (err: any) {
      console.error('Background refresh error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch data';
      setError(errorMessage);
      onError?.(err);
      
      // Still complete initial loading even on error
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setIsLoading(false);
      }
    } finally {
      // Only clear refreshing state if this call set it
      if (shouldShowRefreshing) {
        setIsRefreshing(false);
      }
    }
  }, [fetchFn, onError, onSuccess]);

  const scheduleNextPoll = useCallback((currentData: T) => {
    // Clear existing timeout
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }

    // Determine polling interval based on data state
    const needsActivePolling = shouldPoll(currentData);
    const interval = needsActivePolling ? activeInterval : inactiveInterval;

    // Schedule next poll only if we need to continue polling
    if (needsActivePolling || inactiveInterval > 0) {
      intervalRef.current = setTimeout(() => {
        fetchData(true); // Background refresh
      }, interval);
    }
  }, [shouldPoll, activeInterval, inactiveInterval, fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(false); // Manual refresh (not background)
  }, [fetchData]);

  const startPolling = useCallback(() => {
    if (!isInitialLoadRef.current && data) {
      scheduleNextPoll(data);
    }
  }, [data, scheduleNextPoll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial data fetch
  const initialFetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  return {
    data,
    isLoading,
    error,
    isRefreshing,
    refresh,
    startPolling,
    stopPolling,
    // Internal methods for initialization
    _initialFetch: initialFetch,
    _cleanup: cleanup
  } as UseBackgroundRefreshReturn<T> & { _initialFetch: () => void; _cleanup: () => void };
}

// Hook for components that need to start fetching on mount
export function useBackgroundRefreshWithMount<T>(
  options: UseBackgroundRefreshOptions<T>
): UseBackgroundRefreshReturn<T> {
  const result = useBackgroundRefresh(options);
  
  // Start initial fetch on mount
  useEffect(() => {
    (result as any)._initialFetch();
    return (result as any)._cleanup;
  }, []);

  return result;
}