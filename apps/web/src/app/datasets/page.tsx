'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProjectSelector } from '@/components/datasets/project-selector';
import { PolicySelector } from '@/components/policies/policy-selector';
import { FileUpload } from '@/components/datasets/file-upload';
import { RecentUploads } from '@/components/datasets/recent-uploads';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { FolderOpen, Upload, Database, TrendingUp, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

interface Policy {
  id: string;
  name: string;
  description?: string;
  version: string;
  isActive: boolean;
  isDefault: boolean;
  _count: {
    versions: number;
  };
}

export default function DatasetsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [selectedProject, setSelectedProject] = useState<Project>();
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();
  const [selectedPolicy, setSelectedPolicy] = useState<Policy>();
  const [uploadKey, setUploadKey] = useState(0); // Force re-render of upload component
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show content immediately after component mounts
    setLoading(false);
  }, []);

  const handleProjectSelect = (projectId: string, project: Project) => {
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    
    toast({
      title: 'Project selected',
      description: `Now uploading to "${project.name}" project`,
    });
  };

  const handlePolicySelect = (policyId: string, policy: Policy) => {
    setSelectedPolicyId(policyId);
    setSelectedPolicy(policy);
    
    toast({
      title: 'Policy selected',
      description: `Using "${policy.name}" policy for PII detection`,
    });
  };

  const handleUploadComplete = (result: any) => {
    // Refresh upload component to clear completed uploads
    setUploadKey(prev => prev + 1);
    
    // You could also refresh project data here to update dataset counts
    console.log('Upload completed:', result);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-8 max-w-6xl">
          {loading ? (
            <div className="space-y-6">
              {/* Header skeleton */}
              <div className="mb-8">
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>

              {/* Stats cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-24 mb-2" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Content grid skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left column */}
                <div className="space-y-6">
                  <div className="rounded-lg border bg-card p-6">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  
                  <div className="rounded-lg border bg-card p-6">
                    <Skeleton className="h-5 w-40 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </div>

                  <div className="rounded-lg border bg-card p-6">
                    <Skeleton className="h-5 w-32 mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  <div className="rounded-lg border bg-card p-8 text-center">
                    <Skeleton className="h-16 w-16 mx-auto mb-4" />
                    <Skeleton className="h-6 w-48 mx-auto mb-2" />
                    <Skeleton className="h-4 w-64 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-[15px] font-bold text-foreground">
                  Datasets
                </h1>
                <p className="text-muted-foreground text-[13px] mt-2">
                  Upload files for PII detection and manage your data sources
                </p>
              </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <div className="p-4">
                <div className="flex items-center">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">Selected Project</p>
                    <p className="text-xl font-semibold">
                      {selectedProject ? selectedProject.name : 'None selected'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">PII Policy</p>
                    <p className="text-xl font-semibold">
                      {selectedPolicy ? selectedPolicy.name : 'None selected'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center">
                  <Upload className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">Datasets</p>
                    <p className="text-xl font-semibold">
                      {selectedProject?._count?.datasets || 0}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">Status</p>
                    <p className="text-xl font-semibold">
                      {(selectedProjectId && selectedPolicyId) ? 'Ready to upload' : 'Configure settings'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Project & Policy Selection */}
            <div className="space-y-6">
              <ProjectSelector
                selectedProjectId={selectedProjectId}
                onProjectSelect={handleProjectSelect}
              />

              <Card className="p-6">
                <h3 className="font-semibold mb-4">
                  PII Detection Policy
                </h3>
                <PolicySelector
                  selectedPolicyId={selectedPolicyId}
                  onPolicySelect={handlePolicySelect}
                  placeholder="Select a policy for PII detection..."
                />
              </Card>

              {/* Instructions */}
              <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  Getting Started
                </h3>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-200">
                  <p>1. Select or create a project to organize your datasets</p>
                  <p>2. Choose a PII detection policy for analysis configuration</p>
                  <p>3. Upload files containing potential PII data</p>
                  <p>4. Our system will automatically detect and analyze sensitive information</p>
                  <p>5. View results and manage findings in the project dashboard</p>
                </div>
              </Card>
            </div>

            {/* Right Column: File Upload */}
            <div className="space-y-6">
              {selectedProjectId && selectedPolicyId ? (
                <FileUpload
                  key={uploadKey}
                  projectId={selectedProjectId}
                  policyId={selectedPolicyId}
                  onUploadComplete={handleUploadComplete}
                  maxFileSize={100}
                />
              ) : (
                <Card className="p-8 text-center">
                  {!selectedProjectId ? (
                    <>
                      <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Select a Project First</h3>
                      <p className="text-muted-foreground mb-4">
                        Choose or create a project to organize your datasets before uploading files.
                      </p>
                    </>
                  ) : (
                    <>
                      <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Select a PII Policy</h3>
                      <p className="text-muted-foreground mb-4">
                        Choose a PII detection policy to configure how sensitive data is analyzed.
                      </p>
                    </>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Both project and policy selection are required for file upload.
                  </p>
                </Card>
              )}
            </div>
          </div>

              {/* Recent Uploads Section */}
              <div className="mt-12">
                <RecentUploads 
                  projectId={selectedProjectId} // Will show all uploads when undefined
                  refreshTrigger={uploadKey}
                />
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}