'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { Plus, FolderOpen, Search } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  createdAt: string;
  _count?: {
    datasets: number;
  };
}

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string, project: Project) => void;
}

export function ProjectSelector({ selectedProjectId, onProjectSelect }: ProjectSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    tags: ''
  });
  const [creating, setCreating] = useState(false);

  // Use proper authentication and project hooks
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { projects, loading, createProject } = useProjects();

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: 'Project name required',
        description: 'Please enter a project name',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const projectData = {
        name: newProject.name.trim(),
        description: newProject.description.trim() || undefined,
        tags: newProject.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      };

      const createdProject = await createProject(projectData);
      
      // Auto-select the new project
      onProjectSelect(createdProject.id, createdProject);
      
      // Reset form
      setNewProject({ name: '', description: '', tags: '' });
      setShowCreateForm(false);
      
      toast({
        title: 'Project created',
        description: `Project "${createdProject.name}" has been created and selected`,
      });
    } catch (error) {
      // Error handling is done by the useProjects hook
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Don't render until authentication is resolved
  if (authLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </Card>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading projects...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Project Display */}
      {selectedProject && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Selected: {selectedProject.name}
              </p>
              {selectedProject.description && (
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  {selectedProject.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-blue-600 dark:text-blue-300">
                {selectedProject._count && (
                  <span>{selectedProject._count.datasets} datasets</span>
                )}
                {selectedProject.tags.length > 0 && (
                  <span>Tags: {selectedProject.tags.join(', ')}</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Project Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Select Project</h3>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? "outline" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              {showCreateForm ? 'Cancel' : 'New Project'}
            </Button>
          </div>

          {/* Create Project Form */}
          {showCreateForm && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="Enter project name..."
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="project-description">Description (Optional)</Label>
                <Input
                  id="project-description"
                  placeholder="Describe this project..."
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="project-tags">Tags (Optional)</Label>
                <Input
                  id="project-tags"
                  placeholder="Enter tags separated by commas..."
                  value={newProject.tags}
                  onChange={(e) => setNewProject(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
              
              <Button 
                onClick={handleCreateProject} 
                disabled={creating || !newProject.name.trim()}
                className="w-full"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Project List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {projects.length === 0 ? (
                  <div>
                    <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No projects found. Create your first project to get started.</p>
                  </div>
                ) : (
                  <p>No projects match your search.</p>
                )}
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedProjectId === project.id
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      : 'hover:bg-muted/50 border-border'
                    }
                  `}
                  onClick={() => onProjectSelect(project.id, project)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{project.name}</h4>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {project._count && (
                          <span>{project._count.datasets} datasets</span>
                        )}
                        <span>
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}