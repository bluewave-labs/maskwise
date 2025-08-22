'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProjectList } from '@/components/projects/project-list';
import { CreateProjectForm } from '@/components/projects/create-project-form';
import { useProjects } from '@/hooks/useProjects';
import { Project, CreateProjectRequest } from '@/types/project';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ViewMode = 'list' | 'create' | 'edit';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreateProject = async (data: CreateProjectRequest) => {
    setActionLoading(true);
    try {
      await createProject(data);
      setViewMode('list');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setViewMode('edit');
  };

  const handleUpdateProject = async (data: CreateProjectRequest) => {
    if (!editingProject) return;
    
    setActionLoading(true);
    try {
      await updateProject(editingProject.id, data);
      setViewMode('list');
      setEditingProject(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    setDeleteConfirm(project.id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setActionLoading(true);
    try {
      await deleteProject(deleteConfirm);
      setDeleteConfirm(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewProject = (project: Project) => {
    // Navigate to project details or datasets filtered by project
    router.push(`/datasets?projectId=${project.id}`);
  };

  const handleManageFiles = (project: Project) => {
    // Navigate to datasets page with project filter
    router.push(`/datasets?projectId=${project.id}`);
  };

  const cancelAction = () => {
    setViewMode('list');
    setEditingProject(null);
    setDeleteConfirm(null);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            {viewMode !== 'list' && (
              <Button
                variant="ghost"
                onClick={cancelAction}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            )}
            
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-2">
              Manage your PII detection projects and organize your datasets
            </p>
          </div>

          {/* Content */}
          {viewMode === 'list' && (
            <ProjectList
              projects={projects}
              loading={loading}
              onCreateProject={() => setViewMode('create')}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              onViewProject={handleViewProject}
              onManageFiles={handleManageFiles}
            />
          )}

          {viewMode === 'create' && (
            <CreateProjectForm
              onSubmit={handleCreateProject}
              onCancel={cancelAction}
              loading={actionLoading}
            />
          )}

          {viewMode === 'edit' && editingProject && (
            <CreateProjectForm
              onSubmit={handleUpdateProject}
              onCancel={cancelAction}
              loading={actionLoading}
              initialData={{
                name: editingProject.name,
                description: editingProject.description || '',
                tags: editingProject.tags || []
              }}
            />
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border shadow-lg max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Delete Project</h3>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Are you sure you want to delete this project? All associated datasets and files will also be removed.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    {actionLoading ? 'Deleting...' : 'Delete Project'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}