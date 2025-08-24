'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '@/components/datasets/file-upload';
import { Separator } from '@/components/ui/separator';
import { api as apiClient } from '@/lib/api';
import { FolderOpen, Upload, CheckCircle2 } from 'lucide-react';

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


interface AddDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export function AddDatasetModal({ isOpen, onClose, onUploadComplete }: AddDatasetModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [selectedProject, setSelectedProject] = useState<Project>();
  const [currentStep, setCurrentStep] = useState<'project' | 'upload'>('project');
  const [uploadKey, setUploadKey] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProjectId(undefined);
      setSelectedProject(undefined);
      setCurrentStep('project');
      setUploadKey(0);
    } else {
      // Fetch projects when modal opens
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await apiClient.get('/projects');
      if (response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProjectId(projectId);
      setSelectedProject(project);
      setCurrentStep('upload');
    }
  };

  const handleUploadCompleteInternal = (result: any) => {
    // Refresh upload component
    setUploadKey(prev => prev + 1);
    // Notify parent component
    onUploadComplete();
    // Close modal after successful upload
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleBack = () => {
    if (currentStep === 'upload') {
      setCurrentStep('project');
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'project':
        return 'Select Project';
      case 'upload':
        return 'Upload Dataset';
      default:
        return 'Add Dataset';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'project':
        return 'Choose a project to organize your dataset';
      case 'upload':
        return 'Upload files and configure PII detection policy';
      default:
        return 'Follow the steps to add a new dataset';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>


        <Separator />

        {/* Selection Summary */}
        {selectedProject && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground">Selected Project:</span>
                <p className="text-sm font-medium">{selectedProject.name}</p>
                {selectedProject.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedProject.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div>
          {currentStep === 'project' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold mb-4">Select Project</h3>
                  
                  <Select
                    value={selectedProjectId || ''}
                    onValueChange={handleProjectSelect}
                    disabled={loadingProjects}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue 
                        placeholder={loadingProjects ? "Loading projects..." : "Choose a project..."} 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedProject && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Selected: {selectedProject.name}</span>
                      </div>
                    </div>
                  )}

                  {projects.length === 0 && !loadingProjects && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No projects available.</p>
                      <p className="text-xs mt-1">Create a project first to upload datasets.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {currentStep === 'upload' && selectedProjectId && (
            <div className="space-y-4">
              <FileUpload
                key={uploadKey}
                projectId={selectedProjectId}
                onUploadComplete={handleUploadCompleteInternal}
                maxFileSize={100}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentStep === 'upload' && (
              <p className="text-[11px] text-muted-foreground">
                Upload files above to complete the process
              </p>
            )}
            {currentStep !== 'project' && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}