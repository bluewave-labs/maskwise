'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useBackgroundRefreshWithMount } from '@/hooks/useBackgroundRefresh';
import { useNotifications } from '@/hooks/useNotifications';
import { useNetworkErrorRecovery } from '@/hooks/useErrorRecovery';
import { useSmartRefresh } from '@/hooks/useSmartRefresh';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { useAuth } from '@/hooks/useAuth';
import { DatasetFindings } from './dataset-findings';
import { JobProgress } from './job-progress';
import { ErrorDetailsModal } from './error-details-modal';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Calendar,
  Database,
  RefreshCw,
  Shield
} from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    findings: number;
  };
  project: {
    id: string;
    name: string;
  };
  jobs?: Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    error: string | null;
  }>;
}

interface RecentUploadsProps {
  projectId?: string;
  refreshTrigger?: number;
}

interface DatasetsResponse {
  datasets: Dataset[];
}

export function RecentUploads({ projectId, refreshTrigger }: RecentUploadsProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [errorDatasetId, setErrorDatasetId] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [previousDatasets, setPreviousDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousDatasetsRef = useRef<Dataset[]>([]);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showUploadCompletionNotification } = useNotifications();

  const fetchDatasets = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      setLoading(false);
      setIsRefreshing(false);
      return { datasets: [] }; // Return empty result instead of undefined
    }

    // Don't fetch if user is not authenticated 
    if (!isAuthenticated) {
      setLoading(false);
      setIsRefreshing(false);
      setDatasets([]);
      return { datasets: [] }; // Return empty result instead of undefined
    }

    if (!loading) setIsRefreshing(true);
    
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '10',
        ...(projectId && { projectId })
      });

      const response = await api.get(`/datasets?${params.toString()}`);
      const newDatasets = response.data.data || response.data.datasets || response.data || [];
      
      // Check for newly completed datasets to show notifications
      if (previousDatasets.length > 0) {
        newDatasets.forEach((newDataset: Dataset) => {
          const oldDataset = previousDatasets.find(d => d.id === newDataset.id);
          if (oldDataset && 
              oldDataset.status !== 'COMPLETED' && 
              newDataset.status === 'COMPLETED') {
            // Dataset just completed - show notification
            const findingsCount = newDataset._count?.findings || 0;
            showUploadCompletionNotification(newDataset.name, findingsCount);
          }
        });
      }
      
      setPreviousDatasets(newDatasets);
      setDatasets(newDatasets);
      setLoading(false);
      setIsRefreshing(false);
      return { datasets: newDatasets };
    } catch (error) {
      setLoading(false);
      setIsRefreshing(false);
      
      // Only throw non-auth errors to avoid toast messages
      if (error?.response?.status !== 401) {
        throw error;
      }
      // For auth errors, return empty result to stop retrying
      return { datasets: [] };
    }
  }, [projectId, authLoading, isAuthenticated]);

  // Enhanced error recovery for network requests
  const {
    execute: executeWithRetry,
    retry: retryFetch,
    error: fetchError,
    isRetrying: isRetryingFetch,
    canRetry
  } = useNetworkErrorRecovery(fetchDatasets, {
    maxAttempts: 3,
    baseDelay: 2000,
    shouldRetry: (error, attempt) => {
      // Don't retry if auth is loading or user is not authenticated
      if (authLoading || !isAuthenticated) {
        return false;
      }
      // Don't retry on authentication errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return true;
    },
    onMaxAttemptsReached: (error) => {
      toast({
        title: 'Connection failed',
        description: 'Unable to load recent uploads. Please check your connection.',
        variant: 'destructive',
        duration: 5000
      });
    }
  });

  // Initial load with error recovery - only when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      executeWithRetry().catch(() => {
        // Error handled by useNetworkErrorRecovery
      });
    }
  }, [refreshTrigger, isAuthenticated, authLoading]); // Removed executeWithRetry from deps to prevent infinite loop

  // Smart polling with dynamic intervals based on dataset activity
  const { refresh: manualRefresh } = useSmartRefresh(
    () => executeWithRetry().catch(() => {}), // Suppress errors, handled by recovery hook
    [refreshTrigger, isAuthenticated, authLoading], // Dependencies
    {
      initialInterval: 5000,  // 5 seconds default
      maxInterval: 30000,     // 30 seconds max
      refreshOnVisibility: true,
      exponentialBackoff: true,
      shouldRefresh: () => {
        // Stop polling if auth is loading or user not authenticated
        if (authLoading || !isAuthenticated) return false;
        
        // Stop polling if there are critical errors
        if (fetchError) return false;
        
        // Continue refreshing
        return true;
      }
    }
  );

  const getStatusIcon = (status: Dataset['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'PROCESSING':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusColor = (status: Dataset['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'CANCELLED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Helper function to detect if dataset has errors
  const hasErrors = (dataset: Dataset) => {
    return dataset.status === 'FAILED' || dataset.status === 'CANCELLED' ||
           (dataset.jobs && dataset.jobs.some(job => job.status === 'FAILED' || job.error));
  };

  // Helper function to get error summary
  const getErrorSummary = (dataset: Dataset) => {
    const failedJobs = dataset.jobs?.filter(job => job.status === 'FAILED' || job.error) || [];
    if (dataset.status === 'FAILED' && failedJobs.length === 0) {
      return 'Processing failed before any jobs started';
    }
    if (dataset.status === 'CANCELLED') {
      return 'Processing was cancelled';
    }
    if (failedJobs.length === 1) {
      const job = failedJobs[0];
      const jobType = job.type.split('_').join(' ').toLowerCase();
      return `${jobType} step failed`;
    }
    if (failedJobs.length > 1) {
      return `${failedJobs.length} processing steps failed`;
    }
    return 'Unknown error occurred';
  };

  if (selectedDatasetId) {
    return (
      <DatasetFindings 
        datasetId={selectedDatasetId} 
        onClose={() => setSelectedDatasetId(null)}
      />
    );
  }

  // Don't render until authentication is resolved
  if (authLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
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
        <div className="flex items-center space-x-2 mb-4">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading recent uploads...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Recent Uploads</h3>
          {projectId && datasets.length > 0 && (
            <Badge variant="outline">{datasets.length} datasets</Badge>
          )}
          {isRefreshing && (
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <LiveIndicator
            isActive={!authLoading && isAuthenticated && !fetchError}
            isPolling={isRefreshing}
            isPaused={authLoading || !isAuthenticated || !!fetchError}
            errorCount={fetchError ? 1 : 0}
            showDetails={true}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => manualRefresh()}
            disabled={isRefreshing || isRetryingFetch}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${(isRefreshing || isRetryingFetch) ? 'animate-spin' : ''}`} />
            {isRetryingFetch ? 'Retrying...' : 'Refresh'}
          </Button>
          
          {/* Show retry button on errors */}
          {fetchError && canRetry && (
            <Button
              variant="destructive"
              size="sm"
              onClick={retryFetch}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-[13px]">No uploads found</p>
          <p className="text-[13px] mt-1">
            {projectId 
              ? 'Upload some files to this project to see them here'
              : 'Select a project and upload files to see analysis results'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
            >
              <div className="flex-shrink-0">
                {getStatusIcon(dataset.status)}
              </div>
              
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-normal truncate">{dataset.name}</p>
                  <Badge className={getStatusColor(dataset.status)}>
                    {dataset.status.toLowerCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
                  <span>{dataset.filename}</span>
                  <span>{dataset.fileType}</span>
                  <span>{formatFileSize(Number(dataset.fileSize))}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(dataset.createdAt)}
                  </span>
                </div>

                {dataset.status === 'COMPLETED' && dataset._count && (
                  <div className="mt-1 text-[13px]">
                    {dataset._count.findings > 0 ? (
                      <span className="text-red-600 font-normal">
                        {dataset._count.findings} PII entities found
                      </span>
                    ) : (
                      <span className="text-green-600 font-normal">
                        No PII detected - Clean dataset
                      </span>
                    )}
                  </div>
                )}

                {/* Enhanced error display */}
                {hasErrors(dataset) && (
                  <div className="mt-1 text-[13px]">
                    <span className="text-red-600 font-normal flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      {getErrorSummary(dataset)}
                    </span>
                  </div>
                )}

                {!projectId && (
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    Project: {dataset.project.name}
                  </div>
                )}

                {/* Show job progress for processing datasets */}
                {(dataset.status === 'PENDING' || dataset.status === 'PROCESSING') && (
                  <div className="mt-3">
                    <JobProgress 
                      datasetId={dataset.id}
                      compact={true}
                      className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {dataset.status === 'COMPLETED' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDatasetId(dataset.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View PII
                    </Button>
                    
                    {/* Check if anonymization is available */}
                    {dataset.jobs?.some(job => job.type === 'ANONYMIZE' && job.status === 'COMPLETED') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/datasets/${dataset.id}/anonymized`)}
                        className="flex items-center gap-1 border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <Shield className="h-3 w-3" />
                        View Anonymized
                      </Button>
                    )}
                  </>
                )}
                
                {/* Enhanced error handling for all error states */}
                {hasErrors(dataset) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setErrorDatasetId(dataset.id)}
                    className="flex items-center gap-1 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {dataset.status === 'CANCELLED' ? 'View Details' : 'Error Details'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Details Modal */}
      <ErrorDetailsModal
        datasetId={errorDatasetId || ''}
        isOpen={!!errorDatasetId}
        onClose={() => setErrorDatasetId(null)}
        onRetry={() => {
          // Trigger refresh after retry
          executeWithRetry().catch(() => {});
        }}
      />
    </Card>
  );
}