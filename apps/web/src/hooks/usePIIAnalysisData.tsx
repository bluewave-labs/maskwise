'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { PIIAnalysisData, PIIAnalysisQueryParams } from '@/types/pii-analysis';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function usePIIAnalysisData() {
  const [data, setData] = useState<PIIAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPIIAnalysisData = useCallback(async (params?: PIIAnalysisQueryParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];

      const response = await axios.get(`${API_BASE_URL}/reports/pii-analysis`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      // Convert date strings to Date objects
      const responseData = response.data.data; // API returns nested data structure
      responseData.dateRange.startDate = new Date(responseData.dateRange.startDate);
      responseData.dateRange.endDate = new Date(responseData.dateRange.endDate);

      setData(responseData);
    } catch (err) {
      console.error('Failed to fetch PII analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PII analysis data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback((params?: PIIAnalysisQueryParams) => {
    fetchPIIAnalysisData(params);
  }, [fetchPIIAnalysisData]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}