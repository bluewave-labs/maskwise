import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Policy, PolicyListResponse, PolicyTemplate, CreatePolicyDto, UpdatePolicyDto, YAMLValidationResult } from '@/types/policy';
import { getErrorMessage } from '@/lib/utils';

export interface PolicyFilters {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export function usePolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchPolicies = useCallback(async (filters: PolicyFilters = {}) => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      setLoading(false);
      return { policies: [], total: 0, pages: 1 };
    }

    // Don't fetch if user is not authenticated
    if (!isAuthenticated) {
      setLoading(false);
      setPolicies([]);
      setTotal(0);
      setPages(1);
      return { policies: [], total: 0, pages: 1 };
    }

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (filters.isActive !== undefined) params.set('isActive', filters.isActive.toString());
      
      const response = await api.get(`/policies?${params.toString()}`);
      const data: PolicyListResponse = response.data;
      
      setPolicies(data.policies);
      setTotal(data.total);
      setPages(data.pages);
      return data;
    } catch (err: any) {
      // Only set error and log for non-auth errors
      if (err.response?.status !== 401) {
        const errorMessage = getErrorMessage(err, 'Failed to fetch policies');
        setError(errorMessage);
        console.error('Error fetching policies:', err);
      }
      // For auth errors, return empty result
      return { policies: [], total: 0, pages: 1 };
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  const getPolicy = useCallback(async (id: string): Promise<Policy | null> => {
    try {
      setError(null);
      const response = await api.get(`/policies/${id}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to fetch policy');
      setError(errorMessage);
      console.error('Error fetching policy:', err);
      return null;
    }
  }, []);

  const createPolicy = useCallback(async (policy: CreatePolicyDto): Promise<Policy | null> => {
    try {
      setError(null);
      const response = await api.post('/policies', policy);
      const newPolicy = response.data;
      setPolicies(prev => [newPolicy, ...prev]);
      setTotal(prev => prev + 1);
      return newPolicy;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to create policy');
      setError(errorMessage);
      console.error('Error creating policy:', err);
      return null;
    }
  }, []);

  const updatePolicy = useCallback(async (id: string, policy: UpdatePolicyDto): Promise<Policy | null> => {
    try {
      setError(null);
      const response = await api.put(`/policies/${id}`, policy);
      const updatedPolicy = response.data;
      setPolicies(prev => prev.map(p => p.id === id ? updatedPolicy : p));
      return updatedPolicy;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to update policy');
      setError(errorMessage);
      console.error('Error updating policy:', err);
      return null;
    }
  }, []);

  const deletePolicy = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await api.delete(`/policies/${id}`);
      setPolicies(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
      return true;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to delete policy');
      setError(errorMessage);
      console.error('Error deleting policy:', err);
      return false;
    }
  }, []);

  const validateYAML = useCallback(async (yamlContent: string): Promise<YAMLValidationResult> => {
    try {
      setError(null);
      const response = await api.post('/policies/validate', { yamlContent });
      return response.data;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to validate YAML');
      setError(errorMessage);
      console.error('Error validating YAML:', err);
      return { isValid: false, errors: [errorMessage] };
    }
  }, []);

  return {
    policies,
    total,
    pages,
    loading,
    error,
    fetchPolicies,
    getPolicy,
    createPolicy,
    updatePolicy,
    deletePolicy,
    validateYAML,
  };
}

export function usePolicyTemplates() {
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/policies/templates');
      setTemplates(response.data);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to fetch policy templates');
      setError(errorMessage);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFromTemplate = useCallback(async (templateId: string, name: string): Promise<Policy | null> => {
    try {
      setError(null);
      console.log('Calling API with:', { templateId, name });
      const response = await api.post(`/policies/from-template/${templateId}`, { name });
      console.log('API response:', response.data);
      return response.data;
    } catch (err: any) {
      console.error('Full error object:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);
      const errorMessage = getErrorMessage(err, 'Failed to create policy from template');
      setError(errorMessage);
      console.error('Error creating from template:', err);
      return null;
    }
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createFromTemplate,
  };
}