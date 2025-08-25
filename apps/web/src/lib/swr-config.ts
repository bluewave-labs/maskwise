import { SWRConfiguration } from 'swr';
import { api } from './api';

/**
 * Global SWR Configuration for API caching and performance optimization
 */
export const swrConfig: SWRConfiguration = {
  // Fetcher function for all SWR hooks
  fetcher: (url: string) => api.get(url).then(res => res.data),
  
  // Cache configuration
  revalidateOnFocus: false, // Don't refetch when window gains focus
  revalidateOnReconnect: true, // Refetch when reconnecting to network
  revalidateIfStale: true, // Revalidate if cache is stale
  
  // Performance settings
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  focusThrottleInterval: 5000, // Throttle focus revalidation to 5 seconds
  
  // Error retry configuration
  errorRetryInterval: 5000, // Retry failed requests after 5 seconds
  errorRetryCount: 3, // Retry up to 3 times
  shouldRetryOnError: true,
  
  // Loading states
  loadingTimeout: 3000, // Show loading after 3 seconds
  
  // Callback functions
  onError: (error, key) => {
    console.error(`SWR Error for ${key}:`, error);
  },
  
  onSuccess: (data, key) => {
    // Optional: Log successful cache updates in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`SWR Success for ${key}`);
    }
  },
};

/**
 * Custom cache provider for persistent caching
 * Uses localStorage for persistence across sessions
 */
export const localStorageProvider = () => {
  // When initializing, restore data from localStorage
  const map = new Map<string, any>(
    JSON.parse(localStorage.getItem('app-cache') || '[]')
  );

  // Before unloading the page, save data to localStorage
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const appCache = JSON.stringify(Array.from(map.entries()));
      localStorage.setItem('app-cache', appCache);
    });
  }

  return map;
};

/**
 * Cache key generators for consistent caching
 */
export const cacheKeys = {
  // Dashboard
  dashboardStats: () => '/dashboard/stats',
  
  // Projects
  projects: () => '/projects',
  project: (id: string) => `/projects/${id}`,
  
  // Datasets
  datasets: (params?: any) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return `/datasets${query}`;
  },
  dataset: (id: string) => `/datasets/${id}`,
  datasetFindings: (id: string, page?: number) => 
    `/datasets/${id}/findings${page ? `?page=${page}` : ''}`,
  
  // Policies
  policies: (params?: any) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return `/policies${query}`;
  },
  policy: (id: string) => `/policies/${id}`,
  policyTemplates: () => '/policies/templates',
  
  // Users
  users: () => '/users',
  user: (id: string) => `/users/${id}`,
  userProfile: () => '/users/profile',
  
  // Audit logs
  auditLogs: (params?: any) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return `/users/audit-logs${query}`;
  },
  
  // API Keys
  apiKeys: () => '/api-keys',
  
  // Reports
  reports: (params?: any) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return `/reports${query}`;
  },
};

/**
 * Prefetch commonly used data
 */
export const prefetchCommonData = async () => {
  // Prefetch critical data that's likely to be needed
  const criticalEndpoints = [
    cacheKeys.dashboardStats(),
    cacheKeys.projects(),
    cacheKeys.policies(),
  ];
  
  // Use Promise.allSettled to handle individual failures gracefully
  await Promise.allSettled(
    criticalEndpoints.map(endpoint => 
      api.get(endpoint).catch(err => 
        console.warn(`Failed to prefetch ${endpoint}:`, err)
      )
    )
  );
};