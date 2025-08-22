'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Upload, 
  Shield, 
  Eye, 
  Download,
  FileText,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { FileUpload } from './file-upload';
import { ProjectSelector } from './project-selector';
import { PolicySelector } from '../policies/policy-selector';
import { RecentUploads } from './recent-uploads';
import { DatasetFindings } from './dataset-findings';
import { AnonymizationResultsViewer } from './anonymization-results-viewer';
import { JobProgress } from './job-progress';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'current' | 'completed' | 'error';
}

interface AnonymizationWorkflowProps {
  className?: string;
  onComplete?: () => void;
}

export function AnonymizationWorkflow({ className, onComplete }: AnonymizationWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string>('');
  const [processingJobId, setProcessingJobId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasFindings, setHasFindings] = useState(false);
  const [hasAnonymized, setHasAnonymized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: WorkflowStep[] = [
    {
      id: 'setup',
      title: 'Setup',
      description: 'Select project and policy',
      icon: FileText,
      status: currentStep > 0 ? 'completed' : currentStep === 0 ? 'current' : 'pending'
    },
    {
      id: 'upload',
      title: 'Upload',
      description: 'Upload files for analysis',
      icon: Upload,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'pending'
    },
    {
      id: 'detect',
      title: 'Detect PII',
      description: 'Identify sensitive data',
      icon: Shield,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'pending'
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Review PII findings',
      icon: Eye,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'pending'
    },
    {
      id: 'anonymize',
      title: 'Anonymize',
      description: 'Apply anonymization',
      icon: Shield,
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'current' : 'pending'
    },
    {
      id: 'download',
      title: 'Download',
      description: 'Export results',
      icon: Download,
      status: currentStep > 5 ? 'completed' : currentStep === 5 ? 'current' : 'pending'
    }
  ];

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setError(null);
  };

  const handlePolicySelect = (policyId: string) => {
    setSelectedPolicyId(policyId);
    setError(null);
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      // Validate setup
      if (!selectedProjectId || !selectedPolicyId) {
        setError('Please select both a project and a policy to continue');
        return;
      }
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleUploadComplete = (datasetId: string) => {
    setUploadedDatasetId(datasetId);
    setIsProcessing(true);
    // Automatically move to detection step
    setTimeout(() => {
      handleNextStep();
    }, 1000);
  };

  const handleDetectionComplete = (jobId: string) => {
    setProcessingJobId(jobId);
    setIsProcessing(false);
    setHasFindings(true);
  };

  const handleAnonymizationComplete = () => {
    setHasAnonymized(true);
    handleNextStep();
  };

  const handleWorkflowComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Select Project</h3>
              <ProjectSelector
                value={selectedProjectId}
                onChange={handleProjectSelect}
                placeholder="Choose a project for this anonymization task"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-3">Select Anonymization Policy</h3>
              <PolicySelector
                value={selectedPolicyId}
                onChange={handlePolicySelect}
                placeholder="Choose a policy to apply to your data"
              />
            </div>
            {selectedProjectId && selectedPolicyId && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Ready to proceed with file upload
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <FileUpload
              projectId={selectedProjectId}
              policyId={selectedPolicyId}
              onUploadComplete={handleUploadComplete}
              className="min-h-[300px]"
            />
            {uploadedDatasetId && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  File uploaded successfully. Processing will begin automatically.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {isProcessing ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">Detecting PII...</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing your file for sensitive information
                </p>
                {processingJobId && (
                  <div className="mt-6">
                    <JobProgress jobId={processingJobId} />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <RecentUploads
                  projectId={selectedProjectId}
                  onDatasetSelect={(dataset) => {
                    if (dataset.status === 'COMPLETED') {
                      handleDetectionComplete(dataset.id);
                    }
                  }}
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {uploadedDatasetId ? (
              <>
                <DatasetFindings
                  datasetId={uploadedDatasetId}
                  className="max-h-[500px] overflow-y-auto"
                />
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Review the PII findings above. Click continue to proceed with anonymization.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No dataset selected. Please go back and upload a file.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {!hasAnonymized ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold mb-2">Ready to Anonymize</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Apply the selected policy to anonymize detected PII
                </p>
                <Button 
                  onClick={() => {
                    setIsProcessing(true);
                    // Simulate anonymization process
                    setTimeout(() => {
                      setIsProcessing(false);
                      handleAnonymizationComplete();
                    }, 3000);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Anonymizing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Start Anonymization
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Anonymization completed successfully!
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {uploadedDatasetId && (
              <AnonymizationResultsViewer
                datasetId={uploadedDatasetId}
                className="max-h-[500px] overflow-y-auto"
              />
            )}
            <div className="flex justify-center pt-6">
              <Button onClick={handleWorkflowComplete} size="lg">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Complete Workflow
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Steps */}
      <div className="relative">
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isCompleted && 'bg-green-600 text-white',
                      isActive && 'bg-blue-600 text-white ring-4 ring-blue-100',
                      !isCompleted && !isActive && 'bg-gray-200 text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      isActive && 'text-blue-600',
                      isCompleted && 'text-green-600',
                      !isActive && !isCompleted && 'text-gray-400'
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-[2px]',
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          onClick={handlePreviousStep}
          disabled={currentStep === 0}
          variant="outline"
        >
          Previous
        </Button>
        {currentStep < steps.length - 1 && (
          <Button
            onClick={handleNextStep}
            disabled={
              (currentStep === 0 && (!selectedProjectId || !selectedPolicyId)) ||
              (currentStep === 1 && !uploadedDatasetId) ||
              (currentStep === 2 && isProcessing) ||
              (currentStep === 4 && !hasAnonymized)
            }
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}