'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  PlayCircle, 
  Pause,
  RefreshCw,
  FileText,
  Search,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface JobProgressData {
  jobs: Array<{
    id: string;
    type: string;
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    progress: number;
    startedAt?: string;
    endedAt?: string;
    error?: string;
    stage: string;
    estimatedCompletion?: string;
    metadata?: any;
  }>;
  overallProgress: number;
  currentStage: string;
  isProcessing: boolean;
  dataset: {
    id: string;
    name: string;
    status: string;
  };
}

interface JobProgressProps {
  datasetId: string;
  onProgressUpdate?: (progress: JobProgressData) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Job Progress Component
 * 
 * Displays real-time progress tracking for dataset processing jobs with:
 * - Overall progress percentage and visual progress bar
 * - Individual job stage indicators with status icons
 * - Real-time polling for live updates
 * - Error handling and retry mechanisms
 * - Compact and full view modes
 */
export function JobProgress({ 
  datasetId, 
  onProgressUpdate, 
  className,
  compact = false 
}: JobProgressProps) {
  const [progressData, setProgressData] = useState<JobProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Stage icon mapping
  const getStageIcon = (type: string, status: string) => {
    const iconClass = "h-4 w-4";
    
    switch (type) {
      case 'EXTRACT_TEXT':
        return <FileText className={iconClass} />;
      case 'ANALYZE_PII':
        return <Search className={iconClass} />;
      case 'ANONYMIZE':
        return <Shield className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  // Status icon mapping
  const getStatusIcon = (status: string) => {
    const iconClass = "h-4 w-4";
    
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className={cn(iconClass, "text-green-600")} />;
      case 'RUNNING':
        return <PlayCircle className={cn(iconClass, "text-blue-600")} />;
      case 'FAILED':
        return <XCircle className={cn(iconClass, "text-red-600")} />;
      case 'CANCELLED':
        return <XCircle className={cn(iconClass, "text-gray-600")} />;
      case 'QUEUED':
        return <Clock className={cn(iconClass, "text-yellow-600")} />;
      default:
        return <Clock className={cn(iconClass, "text-gray-400")} />;
    }
  };

  // Status badge variant mapping
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default'; // Green
      case 'RUNNING':
        return 'secondary'; // Blue
      case 'FAILED':
        return 'destructive'; // Red
      case 'CANCELLED':
        return 'outline'; // Gray
      case 'QUEUED':
        return 'secondary'; // Yellow
      default:
        return 'outline';
    }
  };

  // Fetch progress data
  const fetchProgress = async () => {
    try {
      console.log(`[JobProgress] Fetching progress for dataset: ${datasetId}`);
      
      const response = await api.get(`/datasets/${datasetId}/jobs/progress`);
      const data = response.data;

      console.log(`[JobProgress] Progress data received:`, {
        overallProgress: data.overallProgress,
        currentStage: data.currentStage,
        isProcessing: data.isProcessing,
        jobsCount: data.jobs?.length || 0,
        jobs: data.jobs?.map((j: any) => ({ type: j.type, status: j.status, progress: j.progress })) || []
      });
      
      setProgressData(data);
      setError(null);
      setRetryCount(0);

      // Notify parent component
      if (onProgressUpdate) {
        onProgressUpdate(data);
      }

      // Continue polling if processing
      console.log(`[JobProgress] Setting polling state to: ${data.isProcessing}`);
      if (data.isProcessing) {
        setIsPolling(true);
      } else {
        setIsPolling(false);
        console.log(`[JobProgress] Processing completed! Overall progress: ${data.overallProgress}%, Stage: ${data.currentStage}`);
      }

    } catch (err) {
      console.error('[JobProgress] Failed to fetch progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchProgress();
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchProgress();
  }, [datasetId]);

  // Polling effect for active jobs
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(fetchProgress, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [isPolling, datasetId]);

  // Retry effect
  useEffect(() => {
    if (error && retryCount < 3) {
      const timeout = setTimeout(() => {
        fetchProgress();
      }, Math.pow(2, retryCount) * 1000); // Exponential backoff: 1s, 2s, 4s
      
      return () => clearTimeout(timeout);
    }
  }, [error, retryCount]);

  if (loading && !progressData) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center justify-center space-x-2">
          <Spinner size="sm" />
          <span className="text-[13px] text-muted-foreground">Loading progress...</span>
        </div>
      </Card>
    );
  }

  if (error && !progressData) {
    return (
      <Card className={cn("p-4 border-red-200", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-[13px] text-red-600">Failed to load progress</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        {retryCount < 3 && (
          <p className="text-[13px] text-muted-foreground mt-2">
            Retrying in {Math.pow(2, retryCount)} seconds... ({retryCount + 1}/3)
          </p>
        )}
      </Card>
    );
  }

  if (!progressData) {
    return null;
  }

  if (compact) {
    return (
      <Card className={cn("p-3", className)}>
        <div className="flex items-center space-x-3">
          {/* Overall Progress */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-normal">{progressData.currentStage}</span>
              <span className="text-[13px] text-muted-foreground">{progressData.overallProgress}%</span>
            </div>
            <Progress value={progressData.overallProgress} className="h-2" />
          </div>

          {/* Status indicator */}
          <div className="flex items-center space-x-1">
            {progressData.isProcessing ? (
              <Spinner size="sm" />
            ) : (
              getStatusIcon(progressData.overallProgress === 100 ? 'COMPLETED' : 'FAILED')
            )}
          </div>

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            {loading ? <Spinner size="sm" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Processing Progress</h3>
          <p className="text-[13px] text-muted-foreground">
            {progressData.dataset.name}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-normal">Overall Progress</span>
          <span className="text-[13px] text-muted-foreground">{progressData.overallProgress}%</span>
        </div>
        <Progress value={progressData.overallProgress} className="h-3" />
        <p className="text-[13px] text-muted-foreground mt-1">{progressData.currentStage}</p>
      </div>

      {/* Individual Jobs */}
      <div className="space-y-4">
        <h4 className="text-[13px] font-normal text-muted-foreground">Job Stages</h4>
        {progressData.jobs.map((job, index) => (
          <div
            key={job.id}
            className="flex items-center space-x-4 p-3 rounded-lg border bg-card"
          >
            {/* Stage Icon */}
            <div className="flex-shrink-0">
              {getStageIcon(job.type, job.status)}
            </div>

            {/* Job Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-normal">{job.stage}</span>
                <Badge variant={getStatusVariant(job.status)} className="text-[13px]">
                  {job.status.toLowerCase()}
                </Badge>
              </div>
              
              {/* Job Progress Bar */}
              <div className="flex items-center space-x-2">
                <Progress value={job.progress} className="h-2 flex-1" />
                <span className="text-[13px] text-muted-foreground min-w-[3rem]">
                  {job.progress}%
                </span>
              </div>

              {/* Additional Info */}
              {job.error && (
                <p className="text-[13px] text-red-600 mt-1">{job.error}</p>
              )}
              
              {job.estimatedCompletion && (
                <p className="text-[13px] text-muted-foreground mt-1">
                  Est. completion: {new Date(job.estimatedCompletion).toLocaleTimeString()}
                </p>
              )}

              {job.metadata && job.status === 'COMPLETED' && (
                <div className="text-[13px] text-muted-foreground mt-1">
                  {job.type === 'ANALYZE_PII' && job.metadata.entitiesFound && (
                    <span>Found {job.metadata.entitiesFound} PII entities</span>
                  )}
                  {job.type === 'ANONYMIZE' && job.metadata.anonymizationResult?.operationsCount && (
                    <span>Applied {job.metadata.anonymizationResult.operationsCount} anonymizations</span>
                  )}
                </div>
              )}
            </div>

            {/* Status Icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(job.status)}
            </div>
          </div>
        ))}
      </div>

      {/* Auto-refresh indicator */}
      {isPolling && (
        <div className="flex items-center justify-center mt-4 text-[13px] text-muted-foreground">
          <Spinner size="sm" className="mr-2" />
          Auto-refreshing every 3 seconds
        </div>
      )}
    </Card>
  );
}