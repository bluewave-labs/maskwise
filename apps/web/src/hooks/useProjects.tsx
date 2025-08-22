'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, CreateProjectRequest, UpdateProjectRequest, ProjectStats } from '@/types/project';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchProjects = useCallback(async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      
      // Only show error toasts and set error state for non-auth errors
      if (err.response?.status !== 401) {
        const message = err instanceof Error ? err.message : 'Failed to fetch projects';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  const createProject = async (projectData: CreateProjectRequest): Promise<Project> => {
    try {
      const response = await api.post('/projects', projectData);
      const newProject = response.data;
      setProjects(prev => [newProject, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      return newProject;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateProject = async (id: string, projectData: UpdateProjectRequest): Promise<Project> => {
    try {
      const response = await api.put(`/projects/${id}`, projectData);
      const updatedProject = response.data;
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });

      return updatedProject;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      await api.delete(`/projects/${id}`);
      setProjects(prev => prev.filter(p => p.id !== id));
      
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const getProjectStats = async (projectId: string): Promise<ProjectStats> => {
    try {
      const response = await api.get(`/datasets/projects/${projectId}/stats`);
      return response.data;
    } catch (err: any) {
      console.error('Failed to fetch project stats:', err);
      
      // Only show error toasts for non-auth errors
      if (err.response?.status !== 401) {
        const message = err instanceof Error ? err.message : 'Failed to fetch project stats';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectStats,
  };
}