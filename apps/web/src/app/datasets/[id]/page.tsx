'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { api as apiClient } from '@/lib/api';
import { 
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Database,
  User,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  Copy,
  Eye,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Dataset {
  id: string;
  name: string;
  filename: string;
  fileType: string;
  fileSize: number;
  sourcePath: string;
  sourceType: string;
  contentHash: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
  };
  jobs?: Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    createdAt: string;
  }>;
  findings?: Array<{
    id: string;
    entityType: string;
    text: string;
    confidence: number;
    startPos: number;
    endPos: number;
    lineNumber?: number;
  }>;
}

export default function DatasetDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const datasetId = params.id as string;

  useEffect(() => {
    if (datasetId) {
      fetchDatasetDetails();
    }
  }, [datasetId]);

  const fetchDatasetDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/datasets/${datasetId}`);
      setDataset(response.data);
    } catch (err: any) {
      console.error('Error fetching dataset details:', err);
      setError(err.message || 'Failed to fetch dataset details');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dataset details. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'PROCESSING':
        return <Activity className="h-4 w-4 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-normal";
    
    switch (status) {
      case 'PENDING':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'PROCESSING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'COMPLETED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const handleDownload = async (format: string) => {
    if (!dataset) return;

    try {
      toast({
        title: 'Download Starting',
        description: `Preparing ${format.toUpperCase()} file...`,
      });

      const response = await apiClient.get(`/datasets/${dataset.id}/anonymized/download?format=${format}`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create a default one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${dataset.name}_anonymized.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: `${filename} has been downloaded successfully.`,
      });
    } catch (err: any) {
      console.error('Download error:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err.response?.data?.message || 'Failed to download file. Please try again.',
      });
    }
  };


  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout 
          pageTitle="Dataset Details"
          pageDescription="Loading dataset information..."
        >
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
            
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-5 w-32 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </Card>
              ))}
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !dataset) {
    return (
      <ProtectedRoute>
        <DashboardLayout 
          pageTitle="Dataset Not Found"
          pageDescription="The requested dataset could not be found"
        >
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Dataset Not Found</h3>
            <p className="text-muted-foreground mb-6">
              {error || 'The requested dataset could not be found or you do not have access to it.'}
            </p>
            <div className="space-x-3">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => router.push('/datasets')}>
                View All Datasets
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle={dataset.name}
        pageDescription={`Dataset details and analysis results for ${dataset.filename}`}
      >
        <div className="space-y-6">
          {/* Back Button */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{dataset.name}</h1>
                <span className={getStatusBadge(dataset.status)}>
                  {getStatusIcon(dataset.status)}
                  {dataset.status}
                </span>
              </div>
              <p className="text-muted-foreground font-mono text-sm">{dataset.filename}</p>
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Download Anonymized File
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Show original file option for PDFs and DOCs */}
                  {(['PDF', 'DOC', 'DOCX'].includes(dataset.fileType.toUpperCase())) && (
                    <DropdownMenuItem onClick={() => handleDownload(dataset.fileType.toLowerCase())}>
                      <Shield className="h-4 w-4 mr-2" />
                      Anonymized {dataset.fileType.toUpperCase()} (.{dataset.fileType.toLowerCase()})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleDownload('txt')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Anonymized Text (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('json')}>
                    <Database className="h-4 w-4 mr-2" />
                    Anonymized JSON (.json)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('csv')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Anonymized CSV (.csv)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">File Size</p>
                    <p className="text-xl font-semibold">{formatFileSize(Number(dataset.fileSize))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Database className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">PII Findings</p>
                    <p className="text-xl font-semibold">{dataset.findings?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">Jobs</p>
                    <p className="text-xl font-semibold">{dataset.jobs?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">File Type</p>
                    <p className="text-xl font-semibold">{dataset.fileType.toUpperCase()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dataset Information */}
            <Card className="p-6">
              <h3 className="text-[15px] font-semibold mb-4">Dataset Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">{dataset.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Filename:</span>
                  <span className="text-sm font-medium">{dataset.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">File Type:</span>
                  <span className="text-sm font-medium">{dataset.fileType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">File Size:</span>
                  <span className="text-sm font-medium">{formatFileSize(Number(dataset.fileSize))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Source Type:</span>
                  <span className="text-sm font-medium">{dataset.sourceType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dataset ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground">{dataset.id}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-1"
                      onClick={() => copyToClipboard(dataset.id, 'Dataset ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Project Information */}
            <Card className="p-6">
              <h3 className="text-[15px] font-semibold mb-4">Project Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Project:</span>
                  <span className="text-sm font-medium">{dataset.project.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm font-medium">{formatDate(dataset.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated:</span>
                  <span className="text-sm font-medium">{formatDate(dataset.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className={getStatusBadge(dataset.status)}>
                    {getStatusIcon(dataset.status)}
                    {dataset.status}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Jobs */}
          {dataset.jobs && dataset.jobs.length > 0 && (
            <Card className="p-6">
              <h3 className="text-[15px] font-semibold mb-4">Recent Jobs</h3>
              <div className="space-y-3">
                {dataset.jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{job.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-sm font-medium">{job.progress}%</p>
                      </div>
                      <span className={getStatusBadge(job.status)}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* PII Findings */}
          {dataset.findings && dataset.findings.length > 0 && (
            <Card className="p-6" id="findings-section">
              <h3 className="text-[15px] font-semibold mb-4">PII Findings ({dataset.findings?.length || 0})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {dataset.findings.slice(0, 20).map((finding) => (
                  <div key={finding.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{finding.entityType}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Line {finding.lineNumber || 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm font-mono bg-muted/50 p-2 rounded">
                        {finding.text}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-sm font-semibold">{Math.round(finding.confidence * 100)}%</p>
                    </div>
                  </div>
                ))}
                {(dataset.findings?.length || 0) > 20 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Showing 20 of {dataset.findings?.length || 0} findings
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Load More Findings
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {(!dataset.findings || dataset.findings.length === 0) && (
            <Card className="p-6 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No PII Found</h3>
              <p className="text-muted-foreground">
                This dataset has been processed and no personally identifiable information was detected.
              </p>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}