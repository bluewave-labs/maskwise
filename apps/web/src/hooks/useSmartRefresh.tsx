'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface SmartRefreshOptions {
  /** Initial refresh interval in milliseconds (default: 5000) */
  initialInterval?: number;
  /** Maximum refresh interval in milliseconds (default: 30000) */
  maxInterval?: number;
  /** Whether to refresh when page becomes visible (default: true) */
  refreshOnVisibility?: boolean;
  /** Whether to use exponential backoff on errors (default: true) */
  exponentialBackoff?: boolean;
  /** Function to determine if refresh should continue (default: always true) */
  shouldRefresh?: () => boolean;
}

/**
 * Smart Refresh Hook
 * 
 * Provides intelligent auto-refresh functionality with:
 * - Exponential backoff on errors
 * - Page visibility detection
 * - Configurable intervals
 * - Automatic cleanup
 * 
 * @param refreshFn - Function to call for refresh (should return a Promise)
 * @param dependencies - Dependencies that trigger refresh setup
 * @param options - Configuration options
 */
export function useSmartRefresh(
  refreshFn: () => Promise<void>,
  dependencies: React.DependencyList,
  options: SmartRefreshOptions = {}
) {
  const {
    initialInterval = 5000,
    maxInterval = 30000,
    refreshOnVisibility = true,
    exponentialBackoff = true,
    shouldRefresh = () => true
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);
  const currentIntervalRef = useRef(initialInterval);

  const clearCurrentInterval = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (!shouldRefresh()) {
      return;
    }

    const smartRefresh = async () => {
      // Only refresh if page is visible
      if (refreshOnVisibility && document.hidden) {
        // Schedule next check
        intervalRef.current = setTimeout(smartRefresh, currentIntervalRef.current);
        return;
      }

      try {
        await refreshFn();
        
        // Reset on success
        if (exponentialBackoff) {
          attemptCountRef.current = 0;
          currentIntervalRef.current = initialInterval;
        }
      } catch (error) {
        console.warn('Smart refresh failed:', error);
        
        if (exponentialBackoff) {
          attemptCountRef.current++;
          // Exponential backoff with max limit
          currentIntervalRef.current = Math.min(
            initialInterval * Math.pow(2, attemptCountRef.current),
            maxInterval
          );
        }
      }

      // Schedule next refresh if still needed
      if (shouldRefresh()) {
        intervalRef.current = setTimeout(smartRefresh, currentIntervalRef.current);
      }
    };

    // Start first refresh
    intervalRef.current = setTimeout(smartRefresh, currentIntervalRef.current);
  }, [refreshFn, shouldRefresh, initialInterval, maxInterval, refreshOnVisibility, exponentialBackoff]);

  const handleVisibilityChange = useCallback(() => {
    if (!refreshOnVisibility) return;

    if (!document.hidden && shouldRefresh()) {
      // Page became visible, refresh immediately and restart cycle
      clearCurrentInterval();
      
      refreshFn().then(() => {
        if (exponentialBackoff) {
          attemptCountRef.current = 0;
          currentIntervalRef.current = initialInterval;
        }
        scheduleRefresh();
      }).catch(() => {
        scheduleRefresh();
      });
    }
  }, [refreshFn, shouldRefresh, clearCurrentInterval, scheduleRefresh, refreshOnVisibility, exponentialBackoff, initialInterval]);

  // Set up refresh cycle when dependencies change
  useEffect(() => {
    if (shouldRefresh()) {
      // Reset state
      attemptCountRef.current = 0;
      currentIntervalRef.current = initialInterval;
      
      // Start refresh cycle
      scheduleRefresh();
    }

    return clearCurrentInterval;
  }, dependencies);

  // Set up visibility change handler
  useEffect(() => {
    if (refreshOnVisibility) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [handleVisibilityChange, refreshOnVisibility]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentInterval();
      if (refreshOnVisibility) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // Return control functions
  return {
    /** Manually trigger a refresh */
    refresh: useCallback(() => {
      clearCurrentInterval();
      return refreshFn().then(() => {
        if (exponentialBackoff) {
          attemptCountRef.current = 0;
          currentIntervalRef.current = initialInterval;
        }
        scheduleRefresh();
      }).catch(() => {
        scheduleRefresh();
      });
    }, [refreshFn, clearCurrentInterval, scheduleRefresh, exponentialBackoff, initialInterval]),

    /** Stop auto-refresh */
    stop: clearCurrentInterval,

    /** Restart auto-refresh */
    start: scheduleRefresh,

    /** Get current refresh interval */
    getCurrentInterval: () => currentIntervalRef.current,

    /** Get current attempt count */
    getAttemptCount: () => attemptCountRef.current
  };
}