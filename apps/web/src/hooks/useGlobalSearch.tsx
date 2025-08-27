'use client';

import { useState, useCallback, useMemo } from 'react';
import { SearchParams, SearchResponse, EntityType } from '@/types/search';
import { api as apiClient } from '@/lib/api';

interface UseGlobalSearchReturn {
  // Search state
  searchParams: SearchParams;
  updateSearchParams: (updates: Partial<SearchParams>) => void;
  resetSearch: () => void;
  
  // Results state
  results: SearchResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Search actions
  executeSearch: () => Promise<void>;
  exportResults: (format: 'csv' | 'json') => Promise<void>;
  
  // Utility functions
  hasFilters: boolean;
  totalFiltersApplied: number;
}

const DEFAULT_SEARCH_PARAMS: SearchParams = {
  page: 1,
  limit: 20,
  sortBy: 'confidence',
  sortOrder: 'desc'
};

export function useGlobalSearch(): UseGlobalSearchReturn {
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update search parameters
  const updateSearchParams = useCallback((updates: Partial<SearchParams>) => {
    setSearchParams(prev => ({
      ...prev,
      ...updates,
      // Reset to page 1 when filters change (unless page is explicitly set)
      page: updates.page !== undefined ? updates.page : 1
    }));
  }, []);

  // Reset all search parameters
  const resetSearch = useCallback(() => {
    setSearchParams(DEFAULT_SEARCH_PARAMS);
    setResults(null);
    setError(null);
  }, []);

  // Execute search API call
  const executeSearch = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (searchParams.query?.trim()) {
        queryParams.set('query', searchParams.query.trim());
      }
      
      if (searchParams.entityTypes?.length) {
        queryParams.set('entityTypes', searchParams.entityTypes.join(','));
      }
      
      if (searchParams.minConfidence !== undefined) {
        queryParams.set('minConfidence', searchParams.minConfidence.toString());
      }
      
      if (searchParams.maxConfidence !== undefined) {
        queryParams.set('maxConfidence', searchParams.maxConfidence.toString());
      }
      
      if (searchParams.dateFrom) {
        queryParams.set('dateFrom', searchParams.dateFrom);
      }
      
      if (searchParams.dateTo) {
        queryParams.set('dateTo', searchParams.dateTo);
      }
      
      if (searchParams.projectIds?.length) {
        queryParams.set('projectIds', searchParams.projectIds.join(','));
      }
      
      if (searchParams.datasetIds?.length) {
        queryParams.set('datasetIds', searchParams.datasetIds.join(','));
      }
      
      queryParams.set('page', (searchParams.page || 1).toString());
      queryParams.set('limit', (searchParams.limit || 20).toString());
      queryParams.set('sortBy', searchParams.sortBy || 'confidence');
      queryParams.set('sortOrder', searchParams.sortOrder || 'desc');

      // Make API request
      const response = await apiClient.get(`/datasets/search/findings?${queryParams.toString()}`);
      setResults(response.data);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Search failed';
      setError(errorMessage);
      console.error('Global search error:', err);
      
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, isLoading]);

  // Export search results
  const exportResults = useCallback(async (format: 'csv' | 'json') => {
    if (isLoading) return;

    try {
      // Build query parameters (same as executeSearch but without pagination for export)
      const queryParams = new URLSearchParams();
      
      queryParams.set('format', format);
      
      if (searchParams.query?.trim()) {
        queryParams.set('query', searchParams.query.trim());
      }
      
      if (searchParams.entityTypes?.length) {
        queryParams.set('entityTypes', searchParams.entityTypes.join(','));
      }
      
      if (searchParams.minConfidence !== undefined) {
        queryParams.set('minConfidence', searchParams.minConfidence.toString());
      }
      
      if (searchParams.maxConfidence !== undefined) {
        queryParams.set('maxConfidence', searchParams.maxConfidence.toString());
      }
      
      if (searchParams.dateFrom) {
        queryParams.set('dateFrom', searchParams.dateFrom);
      }
      
      if (searchParams.dateTo) {
        queryParams.set('dateTo', searchParams.dateTo);
      }
      
      if (searchParams.projectIds?.length) {
        queryParams.set('projectIds', searchParams.projectIds.join(','));
      }
      
      if (searchParams.datasetIds?.length) {
        queryParams.set('datasetIds', searchParams.datasetIds.join(','));
      }

      // Create download link
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];

      if (!token) {
        throw new Error('No authentication token found');
      }

      const exportUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/datasets/search/export?${queryParams.toString()}`;
      
      // Create temporary link for download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.style.display = 'none';
      
      // Set authorization header via fetch and blob download
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': format === 'json' ? 'application/json' : 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `findings_export.${format}`;
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Export failed';
      setError(errorMessage);
      console.error('Export error:', err);
    }
  }, [searchParams, isLoading]);

  // Computed properties
  const hasFilters = useMemo(() => {
    return !!(
      searchParams.query?.trim() ||
      searchParams.entityTypes?.length ||
      searchParams.minConfidence !== undefined ||
      searchParams.maxConfidence !== undefined ||
      searchParams.dateFrom ||
      searchParams.dateTo ||
      searchParams.projectIds?.length ||
      searchParams.datasetIds?.length
    );
  }, [searchParams]);

  const totalFiltersApplied = useMemo(() => {
    let count = 0;
    if (searchParams.query?.trim()) count++;
    if (searchParams.entityTypes?.length) count++;
    if (searchParams.minConfidence !== undefined || searchParams.maxConfidence !== undefined) count++;
    if (searchParams.dateFrom || searchParams.dateTo) count++;
    if (searchParams.projectIds?.length) count++;
    if (searchParams.datasetIds?.length) count++;
    return count;
  }, [searchParams]);

  return {
    // State
    searchParams,
    updateSearchParams,
    resetSearch,
    
    // Results
    results,
    isLoading,
    error,
    
    // Actions
    executeSearch,
    exportResults,
    
    // Utils
    hasFilters,
    totalFiltersApplied
  };
}