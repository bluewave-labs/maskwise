import { useEffect, useRef, useCallback } from 'react';

interface UseSmartPollingOptions {
  /**
   * Function to execute on each poll
   */
  onPoll: () => Promise<void> | void;
  
  /**
   * Function that determines if polling should be active
   * Return true for fast polling, false for slow polling, null to stop
   */
  isActive: () => boolean | null;
  
  /**
   * Fast polling interval in milliseconds (for active jobs)
   * @default 2000 (2 seconds)
   */
  fastInterval?: number;
  
  /**
   * Slow polling interval in milliseconds (for idle state)
   * @default 10000 (10 seconds)
   */
  slowInterval?: number;
  
  /**
   * Whether to poll immediately on mount
   * @default true
   */
  immediate?: boolean;
  
  /**
   * Whether to pause polling when page is not visible
   * @default true
   */
  pauseOnHidden?: boolean;
  
  /**
   * Maximum number of consecutive errors before stopping polling
   * @default 5
   */
  maxErrors?: number;
}

/**
 * Smart polling hook that adapts polling frequency based on activity
 * and handles page visibility, errors, and cleanup automatically
 */
export function useSmartPolling({
  onPoll,
  isActive,
  fastInterval = 2000,
  slowInterval = 10000,
  immediate = true,
  pauseOnHidden = true,
  maxErrors = 5
}: UseSmartPollingOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const lastPollTimeRef = useRef<number>(0);

  // Clear existing timeout
  const clearPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Execute poll with error handling
  const executePoll = useCallback(async () => {
    if (isPollingRef.current) return; // Prevent concurrent polls
    
    try {
      isPollingRef.current = true;
      lastPollTimeRef.current = Date.now();
      await onPoll();
      errorCountRef.current = 0; // Reset error count on success
    } catch (error) {
      errorCountRef.current++;
      console.warn(`Polling error (${errorCountRef.current}/${maxErrors}):`, error);
      
      // Stop polling if too many consecutive errors
      if (errorCountRef.current >= maxErrors) {
        console.error('Max polling errors reached, stopping polling');
        return;
      }
    } finally {
      isPollingRef.current = false;
    }
  }, [onPoll, maxErrors]);

  // Schedule next poll
  const scheduleNextPoll = useCallback(() => {
    clearPolling();
    
    // Check if polling should continue
    const activeState = isActive();
    if (activeState === null) return; // Stop polling
    
    // Check page visibility
    if (pauseOnHidden && document.hidden) {
      // Check again when page becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          scheduleNextPoll();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return;
    }
    
    // Stop if too many errors
    if (errorCountRef.current >= maxErrors) return;
    
    // Determine interval based on activity
    const interval = activeState ? fastInterval : slowInterval;
    
    timeoutRef.current = setTimeout(async () => {
      await executePoll();
      scheduleNextPoll(); // Schedule next poll after completion
    }, interval);
  }, [isActive, pauseOnHidden, fastInterval, slowInterval, maxErrors, clearPolling, executePoll]);

  // Start polling
  const startPolling = useCallback(() => {
    if (immediate) {
      executePoll().then(() => scheduleNextPoll());
    } else {
      scheduleNextPoll();
    }
  }, [immediate, executePoll, scheduleNextPoll]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    clearPolling();
    await executePoll();
    scheduleNextPoll();
  }, [clearPolling, executePoll, scheduleNextPoll]);

  // Get current polling status
  const getStatus = useCallback(() => {
    const activeState = isActive();
    const now = Date.now();
    const timeSinceLastPoll = now - lastPollTimeRef.current;
    
    return {
      isActive: activeState === true,
      isPolling: isPollingRef.current,
      isPaused: pauseOnHidden && document.hidden,
      errorCount: errorCountRef.current,
      timeSinceLastPoll,
      nextPollIn: timeoutRef.current ? fastInterval - timeSinceLastPoll : 0,
      interval: activeState ? fastInterval : slowInterval
    };
  }, [isActive, pauseOnHidden, fastInterval, slowInterval]);

  // Setup polling on mount
  useEffect(() => {
    startPolling();
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && pauseOnHidden) {
        // Resume polling when page becomes visible
        const timeSinceLastPoll = Date.now() - lastPollTimeRef.current;
        const activeState = isActive();
        const interval = activeState ? fastInterval : slowInterval;
        
        // If enough time has passed, poll immediately
        if (timeSinceLastPoll >= interval) {
          refresh();
        } else {
          scheduleNextPoll();
        }
      }
    };

    if (pauseOnHidden) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Cleanup on unmount
    return () => {
      clearPolling();
      if (pauseOnHidden) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [startPolling, pauseOnHidden, clearPolling, refresh, scheduleNextPoll, isActive, fastInterval, slowInterval]);

  return {
    refresh,
    getStatus,
    stop: clearPolling
  };
}