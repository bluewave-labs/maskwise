'use client';

import { Job } from '@/hooks/useJobs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  AlertCircle,
  Copy,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface JobDetailsModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryJob?: (job: Job) => void;
  onCancelJob?: (job: Job) => void;
  onViewDataset?: (job: Job) => void;
}

export function JobDetailsModal({
  job,
  open,
  onOpenChange,
  onRetryJob,
  onCancelJob,
  onViewDataset
}: JobDetailsModalProps) {
  if (!job) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="h-4 w-4" />;
      case 'RUNNING':
        return <Activity className="h-4 w-4 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-normal";
    
    switch (status) {
      case 'QUEUED':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'RUNNING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'COMPLETED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'CANCELLED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatJobType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateDuration = () => {
    if (job.endedAt) {
      const duration = new Date(job.endedAt).getTime() - new Date(job.startedAt || job.createdAt).getTime();
      const seconds = Math.floor(duration / 1000);
      if (seconds < 60) return `${seconds} seconds`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (job.status === 'RUNNING' && job.startedAt) {
      const elapsed = new Date().getTime() - new Date(job.startedAt).getTime();
      const seconds = Math.floor(elapsed / 1000);
      if (seconds < 60) return `${seconds} seconds (running)`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s (running)`;
    }
    return 'Not completed';
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const canRetry = job.status === 'FAILED';
  const canCancel = job.status === 'QUEUED' || job.status === 'RUNNING';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Job Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">{formatJobType(job.type)}</h3>
              <p className="text-sm text-muted-foreground">
                Job ID: {job.id}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-1 ml-2"
                  onClick={() => copyToClipboard(job.id, 'Job ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {job.dataset && onViewDataset && (
                <Button 
                  variant="outline" 
                  onClick={() => onViewDataset(job)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Dataset Details
                </Button>
              )}
              <span className={getStatusBadge(job.status)}>
                {job.status}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{job.progress || 0}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${job.progress || 0}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-[15px] font-semibold">
                Job Information
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="text-sm font-medium">{formatJobType(job.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Priority:</span>
                  <span className="text-sm font-medium">{job.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span className="text-sm font-medium">{calculateDuration()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[15px] font-semibold">
                Timeline
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm font-medium">{formatDateTime(job.createdAt)}</span>
                </div>
                {job.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Started:</span>
                    <span className="text-sm font-medium">{formatDateTime(job.startedAt)}</span>
                  </div>
                )}
                {job.endedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ended:</span>
                    <span className="text-sm font-medium">{formatDateTime(job.endedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dataset Information */}
          {job.dataset && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-[15px] font-semibold">
                  Dataset Information
                </h4>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">{job.dataset.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Filename:</span>
                    <span className="text-sm font-medium">{job.dataset.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Dataset ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{job.dataset.id}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-1"
                        onClick={() => copyToClipboard(job.dataset!.id, 'Dataset ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Policy Information */}
          {job.policy && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-[15px] font-semibold">
                  Policy Information
                </h4>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Policy Name:</span>
                    <span className="text-sm font-medium">{job.policy.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Policy ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{job.policy.id}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-1"
                        onClick={() => copyToClipboard(job.policy!.id, 'Policy ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* User Information */}
          {job.createdBy && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-[15px] font-semibold">
                  Created By
                </h4>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">
                      {job.createdBy.firstName} {job.createdBy.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm font-medium">{job.createdBy.email}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Information */}
          {job.error && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-[15px] font-semibold text-red-600">
                  Error Details
                </h4>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                    {job.error}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          {job.metadata && Object.keys(job.metadata).length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-[15px] font-semibold">
                  Metadata
                </h4>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(job.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          {(canRetry || canCancel) && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-3">
                {canRetry && onRetryJob && (
                  <Button 
                    variant="outline" 
                    onClick={() => onRetryJob(job)}
                    className="flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Retry Job
                  </Button>
                )}
                
                {canCancel && onCancelJob && (
                  <Button 
                    variant="destructive" 
                    onClick={() => onCancelJob(job)}
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Cancel Job
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}