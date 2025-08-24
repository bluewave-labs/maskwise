'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  AlertTriangle,
  Clock,
  XCircle,
  RefreshCw,
  FileText,
  Zap,
  Database,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';

interface Job {
  id: string;
  type: string;
  status: string;
  error: string | null;
  progress: number;
  startedAt: string | null;
  endedAt: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface Dataset {
  id: string;
  name: string;
  filename: string;
  status: string;
  jobs: Job[];
  createdAt: string;
  updatedAt: string;
  project: {
    name: string;
  };
}

interface ErrorDetailsModalProps {
  datasetId: string;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export function ErrorDetailsModal({ datasetId, isOpen, onClose, onRetry }: ErrorDetailsModalProps) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (isOpen && datasetId) {
      fetchDatasetDetails();
    }
  }, [isOpen, datasetId]);

  const fetchDatasetDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/datasets/${datasetId}`);
      setDataset(response.data);
    } catch (error) {
      toast({
        title: 'Error loading details',
        description: 'Unable to load dataset error details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryProcessing = async () => {
    setRetrying(true);
    try {
      await api.post(`/datasets/${datasetId}/retry`);
      toast({
        title: 'Processing restarted',
        description: 'The dataset has been queued for reprocessing.',
      });
      onRetry?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Unable to restart processing. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setRetrying(false);
    }
  };

  const getJobIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'FILE_PROCESSING':
        return <FileText className="h-4 w-4" />;
      case 'TEXT_EXTRACTION':
        return <FileText className="h-4 w-4" />;
      case 'ANALYZE_PII':
      case 'PII_ANALYSIS':
        return <Zap className="h-4 w-4" />;
      case 'ANONYMIZE':
        return <Database className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getJobStatus = (job: Job) => {
    switch (job.status.toUpperCase()) {
      case 'COMPLETED':
        return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, color: 'bg-green-100 text-green-800' };
      case 'FAILED':
        return { icon: <XCircle className="h-4 w-4 text-red-500" />, color: 'bg-red-100 text-red-800' };
      case 'PROCESSING':
        return { icon: <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />, color: 'bg-blue-100 text-blue-800' };
      case 'PENDING':
        return { icon: <Clock className="h-4 w-4 text-yellow-500" />, color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { icon: <Clock className="h-4 w-4 text-gray-500" />, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const formatJobType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const copyErrorToClipboard = (error: string) => {
    navigator.clipboard.writeText(error);
    toast({
      title: 'Copied to clipboard',
      description: 'Error details copied for support.',
    });
  };

  const getErrorCategory = (error: string | null, jobType: string) => {
    if (!error) return 'Unknown';
    
    const errorLower = error.toLowerCase();
    if (errorLower.includes('timeout') || errorLower.includes('connection')) return 'Network';
    if (errorLower.includes('file') || errorLower.includes('format')) return 'File';
    if (errorLower.includes('presidio') || errorLower.includes('pii')) return 'PII Analysis';
    if (errorLower.includes('memory') || errorLower.includes('resource')) return 'Resource';
    if (errorLower.includes('auth') || errorLower.includes('permission')) return 'Authorization';
    return 'System';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Loading Error Details...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!dataset) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Error Details Not Available
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Unable to load error details for this dataset.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const failedJobs = dataset.jobs.filter(job => job.status === 'FAILED');
  const hasErrors = failedJobs.length > 0 || dataset.status === 'FAILED';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Dataset Processing Errors
          </DialogTitle>
        </DialogHeader>

        {/* Dataset Overview */}
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-red-900">{dataset.name}</h3>
              <p className="text-[13px] text-red-700 mt-1">
                Filename: {dataset.filename} • Project: {dataset.project.name}
              </p>
              <p className="text-[13px] text-red-700">
                Last Updated: {formatDate(dataset.updatedAt)}
              </p>
            </div>
            <Badge className="bg-red-100 text-red-800">
              {dataset.status}
            </Badge>
          </div>
        </Card>

        {/* Processing Pipeline Status */}
        <div className="space-y-4">
          <h4 className="font-semibold">Processing Pipeline Status</h4>
          
          {dataset.jobs.length === 0 ? (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">No Processing Jobs Found</p>
                  <p className="text-[13px] text-yellow-700">
                    This dataset may have failed before any processing jobs were created.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {dataset.jobs.map((job, index) => {
                const status = getJobStatus(job);
                const isLastJob = index === dataset.jobs.length - 1;
                
                return (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        {getJobIcon(job.type)}
                        {!isLastJob && (
                          <div className="w-px h-8 bg-gray-300 mt-2" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold">{formatJobType(job.type)}</h5>
                            <Badge className={status.color}>
                              {job.status.toLowerCase()}
                            </Badge>
                          </div>
                          {status.icon}
                        </div>
                        
                        <div className="text-[13px] text-muted-foreground space-y-1">
                          <p>Created: {formatDate(job.createdAt)}</p>
                          {job.startedAt && (
                            <p>Started: {formatDate(job.startedAt)}</p>
                          )}
                          {job.endedAt && (
                            <p>Ended: {formatDate(job.endedAt)}</p>
                          )}
                          {job.progress > 0 && job.progress < 100 && (
                            <p>Progress: {job.progress}%</p>
                          )}
                        </div>

                        {/* Success metadata */}
                        {job.status === 'COMPLETED' && job.metadata && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-[13px]">
                            {job.metadata.message && (
                              <p className="text-green-700">{job.metadata.message}</p>
                            )}
                            {job.metadata.entitiesFound !== undefined && (
                              <p className="text-green-600">
                                Found {job.metadata.entitiesFound} PII entities
                              </p>
                            )}
                          </div>
                        )}

                        {/* Error details */}
                        {job.status === 'FAILED' && (
                          <div className="mt-2 space-y-2">
                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="font-semibold text-red-900">
                                      {getErrorCategory(job.error, job.type)} Error
                                    </span>
                                  </div>
                                  <p className="text-[13px] text-red-800 font-mono bg-red-100 p-2 rounded">
                                    {job.error || 'Unknown error occurred'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyErrorToClipboard(job.error || 'Unknown error')}
                                  className="ml-2"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/docs', '_blank')}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              API Docs
            </Button>
            
            {hasErrors && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const errorSummary = failedJobs.map(job => 
                    `${job.type}: ${job.error}`
                  ).join('\n');
                  copyErrorToClipboard(`Dataset: ${dataset.name}\n${errorSummary}`);
                }}
                className="flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy All Errors
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {hasErrors && (
              <Button
                onClick={handleRetryProcessing}
                disabled={retrying}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry Processing'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}