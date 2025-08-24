'use client';

import { useState, useEffect, useCallback } from 'react';
import { ComplianceData, ComplianceQueryParams } from '@/types/compliance';

interface UseComplianceDataReturn {
  data: ComplianceData | null;
  loading: boolean;
  error: string | null;
  refresh: (params?: ComplianceQueryParams) => Promise<void>;
}

export function useComplianceData(): UseComplianceDataReturn {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (params?: ComplianceQueryParams) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (params?.range) searchParams.append('range', params.range);
      if (params?.policyName) searchParams.append('policyName', params.policyName);
      if (params?.action) searchParams.append('action', params.action);
      if (params?.projectId) searchParams.append('projectId', params.projectId);
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const queryString = searchParams.toString();
      const url = `/api/reports/compliance${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch compliance data: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convert date strings back to Date objects
      const processedData: ComplianceData = {
        ...result.data,
        policyEffectiveness: result.data.policyEffectiveness.map((policy: any) => ({
          ...policy,
          lastApplied: new Date(policy.lastApplied),
        })),
        auditTrail: result.data.auditTrail.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        })),
        dateRange: {
          startDate: new Date(result.data.dateRange.startDate),
          endDate: new Date(result.data.dateRange.endDate),
        },
      };

      setData(processedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error fetching compliance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load with default parameters
  useEffect(() => {
    fetchData({ range: '7d' });
  }, [fetchData]);

  const refresh = useCallback(async (params?: ComplianceQueryParams) => {
    await fetchData(params);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}

// Helper function to get auth token from cookies
function getAuthToken(): string {
  if (typeof document === 'undefined') return '';
  
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'access_token') {
      return decodeURIComponent(value);
    }
  }
  return '';
}