'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Function to determine if error should be retried (default: always retry) */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Called when max attempts reached */
  onMaxAttemptsReached?: (error: Error) => void;
  /** Called on each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

export interface ErrorRecoveryState {
  isLoading: boolean;
  error: Error | null;
  attemptCount: number;
  isRetrying: boolean;
}

/**
 * Error Recovery Hook
 * 
 * Provides robust error handling with automatic retry logic, exponential backoff,
 * and user-friendly error recovery mechanisms.
 */
export function useErrorRecovery<T = any>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    exponentialBackoff = true,
    shouldRetry = () => true,
    onMaxAttemptsReached,
    onRetry
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    isLoading: false,
    error: null,
    attemptCount: 0,
    isRetrying: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      global.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const executeWithRetry = useCallback(async (): Promise<T | undefined> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - reset state
        setState({
          isLoading: false,
          error: null,
          attemptCount: attempt,
          isRetrying: false
        });
        
        return result;
        
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        setState(prev => ({
          ...prev,
          error: errorObj,
          attemptCount: attempt,
          isRetrying: attempt < maxAttempts
        }));

        // Check if we should retry this error
        if (attempt < maxAttempts && shouldRetry(errorObj, attempt)) {
          // Calculate delay with exponential backoff
          const delay = exponentialBackoff 
            ? baseDelay * Math.pow(2, attempt - 1)
            : baseDelay;

          // Notify about retry
          if (onRetry) {
            onRetry(attempt, errorObj);
          }

          // Show retry toast
          toast({
            title: `Retry attempt ${attempt}/${maxAttempts}`,
            description: `Retrying in ${delay / 1000} seconds...`,
            duration: delay
          });

          // Wait before retry
          await new Promise(resolve => {
            timeoutRef.current = setTimeout(resolve, delay);
          });
          
        } else {
          // Max attempts reached or shouldn't retry
          setState(prev => ({
            ...prev,
            isLoading: false,
            isRetrying: false
          }));

          if (onMaxAttemptsReached) {
            onMaxAttemptsReached(errorObj);
          }

          // Show final error toast
          toast({
            title: 'Operation failed',
            description: `Failed after ${attempt} attempts: ${errorObj.message}`,
            variant: 'destructive',
            duration: 5000
          });

          throw errorObj;
        }
      }
    }
  }, [operation, maxAttempts, baseDelay, exponentialBackoff, shouldRetry, onRetry, onMaxAttemptsReached]);

  const retry = useCallback(() => {
    if (state.error) {
      return executeWithRetry();
    }
  }, [state.error, executeWithRetry]);

  const reset = useCallback(() => {
    clearTimeout();
    setState({
      isLoading: false,
      error: null,
      attemptCount: 0,
      isRetrying: false
    });
  }, [clearTimeout]);

  return {
    ...state,
    execute: executeWithRetry,
    retry,
    reset,
    canRetry: state.error !== null && !state.isRetrying
  };
}

/**
 * Network Error Recovery Hook
 * 
 * Specialized hook for handling network requests with intelligent retry logic.
 */
export function useNetworkErrorRecovery<T = any>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'shouldRetry'> & {
    /** Retry on specific HTTP status codes (default: [408, 429, 500, 502, 503, 504]) */
    retryOnStatusCodes?: number[];
  } = {}
) {
  const { retryOnStatusCodes = [408, 429, 500, 502, 503, 504], ...retryOptions } = options;

  const shouldRetry = useCallback((error: Error, attempt: number) => {
    // Network connectivity check
    if (!navigator.onLine) {
      toast({
        title: 'Network offline',
        description: 'Please check your internet connection',
        variant: 'destructive'
      });
      return false;
    }

    // Check for specific error types that should be retried
    if (error.message.includes('fetch')) {
      return true; // Network errors
    }

    // Check for specific HTTP status codes
    if (error.message.includes('HTTP')) {
      const statusMatch = error.message.match(/HTTP (\d+)/);
      if (statusMatch) {
        const statusCode = parseInt(statusMatch[1]);
        return retryOnStatusCodes.includes(statusCode);
      }
    }

    // Don't retry on authentication errors
    if (error.message.includes('401') || error.message.includes('403')) {
      // Only show auth error toast if we're not already handling auth in the app
      // (prevents duplicate toasts when auth system is already handling the redirect)
      const isOnProtectedPage = window.location.pathname.startsWith('/dashboard') || 
                                window.location.pathname.startsWith('/datasets') ||
                                window.location.pathname.startsWith('/projects') ||
                                window.location.pathname.startsWith('/policies');
      
      if (!isOnProtectedPage) {
        toast({
          title: 'Authentication required',
          description: 'Please log in again',
          variant: 'destructive'
        });
      }
      return false;
    }

    return true;
  }, [retryOnStatusCodes]);

  return useErrorRecovery(operation, {
    ...retryOptions,
    shouldRetry
  });
}

/**
 * File Upload Error Recovery Hook
 * 
 * Specialized hook for handling file upload operations with resume capability.
 */
export function useFileUploadErrorRecovery<T = any>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'shouldRetry' | 'maxAttempts'> & {
    /** File size threshold for enabling resume (default: 10MB) */
    resumeThreshold?: number;
  } = {}
) {
  const { resumeThreshold = 10 * 1024 * 1024, ...retryOptions } = options;

  const shouldRetry = useCallback((error: Error, attempt: number) => {
    // Don't retry on file validation errors
    if (error.message.includes('validation') || error.message.includes('format')) {
      return false;
    }

    // Don't retry on authorization errors
    if (error.message.includes('401') || error.message.includes('403')) {
      return false;
    }

    // Retry on network and server errors
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503');
  }, []);

  return useErrorRecovery(operation, {
    ...retryOptions,
    maxAttempts: 5, // More attempts for file uploads
    shouldRetry,
    onRetry: (attempt, error) => {
      toast({
        title: 'Upload retry',
        description: `Retrying file upload (attempt ${attempt})...`,
        duration: 2000
      });
    }
  });
}