'use client';

import { useState, useEffect } from 'react';
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
import { Skeleton, PageSkeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [pageLoading, setPageLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Show content immediately after component mounts
    setPageLoading(false);
  }, []);

  const handleCreateProject = async (data: CreateProjectRequest) => {
    setActionLoading(true);
    try {
      await createProject(data);
      setCreateDialogOpen(false);
      toast({
        title: 'Project Created',
        description: `Project "${data.name}" has been created successfully.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Failed to create the project. Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditDialogOpen(true);
  };

  const handleUpdateProject = async (data: CreateProjectRequest) => {
    if (!editingProject) return;
    
    setActionLoading(true);
    try {
      await updateProject(editingProject.id, data);
      setEditDialogOpen(false);
      setEditingProject(null);
      toast({
        title: 'Project Updated',
        description: `Project "${data.name}" has been updated successfully.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update the project. Please try again.',
      });
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

  const handleCreateCancel = () => {
    setCreateDialogOpen(false);
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  const cancelAction = () => {
    setDeleteConfirm(null);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[15px] font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground text-[13px] mt-2">
              Manage your PII detection projects and organize your datasets
            </p>
          </div>

          {/* Content */}
          {pageLoading ? (
            <div className="space-y-6">
              {/* Search and header skeleton */}
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
              
              {/* Search bar skeleton */}
              <div className="flex gap-4">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
              
              {/* Project cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-lg border bg-card p-6">
                    <Skeleton className="h-5 w-32 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ProjectList
              projects={projects}
              loading={loading}
              onCreateProject={() => setCreateDialogOpen(true)}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              onViewProject={handleViewProject}
              onManageFiles={handleManageFiles}
            />
          )}

          {/* Create Project Modal */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a new PII detection project to organize your datasets
                </DialogDescription>
              </DialogHeader>
              <CreateProjectForm
                onSubmit={handleCreateProject}
                onCancel={handleCreateCancel}
                loading={actionLoading}
              />
            </DialogContent>
          </Dialog>

          {/* Edit Project Modal */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update your project information and settings
                </DialogDescription>
              </DialogHeader>
              {editingProject && (
                <CreateProjectForm
                  onSubmit={handleUpdateProject}
                  onCancel={handleEditCancel}
                  loading={actionLoading}
                  initialData={{
                    name: editingProject.name,
                    description: editingProject.description || ''
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

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