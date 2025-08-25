import useSWR, { SWRResponse, mutate } from 'swr';
import { api } from '@/lib/api';
import { cacheKeys } from '@/lib/swr-config';

/**
 * Custom hooks for optimized data fetching with SWR caching
 */

// Dashboard stats hook with caching
export function useDashboardStatsOptimized() {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.dashboardStats(),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnMount: true,
    }
  );

  return {
    stats: data,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Projects hook with caching
export function useProjectsOptimized() {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.projects(),
    {
      revalidateOnMount: true,
      dedupingInterval: 5000,
    }
  );

  return {
    projects: data?.projects || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Datasets hook with pagination and caching
export function useDatasetsOptimized(params?: {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    params ? cacheKeys.datasets(params) : null,
    {
      revalidateOnMount: true,
      refreshInterval: params?.status === 'PROCESSING' ? 5000 : 0, // Auto-refresh if processing
    }
  );

  return {
    datasets: data?.datasets || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Dataset findings hook with caching
export function useDatasetFindingsOptimized(datasetId: string, page: number = 1) {
  const { data, error, isLoading, mutate } = useSWR(
    datasetId ? cacheKeys.datasetFindings(datasetId, page) : null,
    {
      revalidateOnMount: true,
      dedupingInterval: 10000,
    }
  );

  return {
    findings: data?.findings || [],
    total: data?.total || 0,
    summary: data?.summary,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Policies hook with search and filtering
export function usePoliciesOptimized(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.policies(params),
    {
      revalidateOnMount: true,
      dedupingInterval: 5000,
    }
  );

  return {
    policies: data?.policies || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Policy templates hook with heavy caching
export function usePolicyTemplatesOptimized() {
  const { data, error, isLoading } = useSWR(
    cacheKeys.policyTemplates(),
    {
      revalidateOnMount: false, // Templates rarely change
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute deduping
    }
  );

  return {
    templates: data?.templates || [],
    isLoading,
    error,
  };
}

// Users hook with caching
export function useUsersOptimized() {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.users(),
    {
      revalidateOnMount: true,
      dedupingInterval: 10000,
    }
  );

  return {
    users: data?.users || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch: mutate,
  };
}

// User profile hook with aggressive caching
export function useUserProfileOptimized() {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.userProfile(),
    {
      revalidateOnMount: false, // Profile rarely changes
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    user: data,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Audit logs hook with pagination
export function useAuditLogsOptimized(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.auditLogs(params),
    {
      refreshInterval: 10000, // Refresh every 10 seconds for real-time updates
      revalidateOnMount: true,
    }
  );

  return {
    logs: data?.logs || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch: mutate,
  };
}

// API Keys hook with caching
export function useApiKeysOptimized() {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.apiKeys(),
    {
      revalidateOnMount: true,
      dedupingInterval: 5000,
    }
  );

  return {
    apiKeys: data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

/**
 * Optimistic update helper for mutations
 */
export async function optimisticUpdate<T>(
  key: string,
  updateFn: () => Promise<T>,
  optimisticData: T
) {
  // Optimistically update the cache
  await mutate(
    key,
    optimisticData,
    false // Don't revalidate yet
  );

  try {
    // Perform the actual update
    const result = await updateFn();
    
    // Revalidate with the server response
    await mutate(key, result, false);
    
    return result;
  } catch (error) {
    // Revert on error by revalidating
    await mutate(key);
    throw error;
  }
}

/**
 * Prefetch helper for route transitions
 */
export async function prefetchRoute(route: string) {
  const prefetchMap: Record<string, string[]> = {
    '/dashboard': [cacheKeys.dashboardStats(), cacheKeys.projects()],
    '/datasets': [cacheKeys.datasets(), cacheKeys.projects()],
    '/policies': [cacheKeys.policies(), cacheKeys.policyTemplates()],
    '/projects': [cacheKeys.projects()],
    '/settings': [cacheKeys.userProfile(), cacheKeys.apiKeys()],
    '/audit': [cacheKeys.auditLogs()],
  };

  const endpoints = prefetchMap[route] || [];
  
  await Promise.allSettled(
    endpoints.map(endpoint =>
      api.get(endpoint).then(res => 
        mutate(endpoint, res.data, false)
      ).catch(err => 
        console.warn(`Prefetch failed for ${endpoint}:`, err)
      )
    )
  );
}

/**
 * Clear all SWR cache
 */
export function clearAllCache() {
  // Clear SWR cache
  mutate(() => true, undefined, { revalidate: false });
  
  // Clear localStorage cache if using persistent provider
  if (typeof window !== 'undefined') {
    localStorage.removeItem('app-cache');
  }
}