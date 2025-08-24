'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { OverviewData, OverviewQueryParams } from '@/types/reports';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useOverviewData() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverviewData = useCallback(async (params?: OverviewQueryParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];

      const response = await axios.get(`${API_BASE_URL}/reports/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      // Convert date strings to Date objects
      const responseData = response.data.data; // API returns nested data structure
      responseData.dateRange.startDate = new Date(responseData.dateRange.startDate);
      responseData.dateRange.endDate = new Date(responseData.dateRange.endDate);
      responseData.recentHighRiskFindings = responseData.recentHighRiskFindings.map((finding: any) => ({
        ...finding,
        createdAt: new Date(finding.createdAt),
      }));

      setData(responseData);
    } catch (err) {
      console.error('Failed to fetch overview data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch overview data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback((params?: OverviewQueryParams) => {
    fetchOverviewData(params);
  }, [fetchOverviewData]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}