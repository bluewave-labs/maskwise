'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { 
  Eye, 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  BarChart3,
  FileText,
  Search
} from 'lucide-react';

interface Finding {
  id: string;
  entityType: string;
  text: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
  lineNumber?: number;
  contextBefore?: string;
  contextAfter?: string;
  createdAt: string;
}

interface Dataset {
  id: string;
  name: string;
  filename: string;
  fileType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  rowCount?: number;
  createdAt: string;
  _count?: {
    findings: number;
  };
}

interface DatasetFindingsProps {
  datasetId: string;
  onClose?: () => void;
  className?: string;
}

export function DatasetFindings({ datasetId, onClose, className }: DatasetFindingsProps) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDataset = async () => {
    try {
      const response = await api.get(`/datasets/${datasetId}`);
      setDataset(response.data);
    } catch (error) {
      console.error('Failed to fetch dataset:', error);
      toast({
        title: 'Failed to load dataset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const fetchFindings = async () => {
    try {
      const response = await api.get(`/datasets/${datasetId}/findings?page=1&limit=10`);
      const data = response.data;
      setFindings(data.findings || []);
      setTotalPages(Math.ceil(data.total / data.limit));
    } catch (error) {
      console.error('Failed to fetch findings:', error);
      toast({
        title: 'Failed to load findings',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataset();
    fetchFindings();
  }, [datasetId, page]);

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
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    const colors: Record<string, string> = {
      'EMAIL_ADDRESS': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'PHONE_NUMBER': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'PERSON': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'DATE_TIME': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'URL': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'CREDIT_CARD': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'SSN': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[entityType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getRiskLevel = (confidence: number) => {
    if (confidence >= 0.9) return { level: 'High', color: 'text-red-600' };
    if (confidence >= 0.7) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-green-600' };
  };

  const entityTypeCounts = findings.reduce((acc, finding) => {
    acc[finding.entityType] = (acc[finding.entityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading dataset findings...</span>
        </div>
      </Card>
    );
  }

  if (!dataset) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Dataset not found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-bold">{dataset.name}</h2>
              {getStatusIcon(dataset.status)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
              <div>
                <p className="text-muted-foreground">File</p>
                <p className="font-normal">{dataset.filename}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-normal">{dataset.fileType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-normal capitalize">{dataset.status.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">PII Findings</p>
                <p className="font-normal">{dataset._count?.findings || findings.length}</p>
              </div>
            </div>
          </div>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </Card>

      {/* Entity Type Summary */}
      {Object.keys(entityTypeCounts).length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">PII Entity Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(entityTypeCounts).map(([entityType, count]) => (
              <div key={entityType} className="text-center">
                <Badge className={getEntityTypeColor(entityType)}>
                  {entityType.replace('_', ' ')}
                </Badge>
                <p className="text-2xl font-bold mt-1">{count}</p>
                <p className="text-[13px] text-muted-foreground">findings</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Findings List */}
      <Card className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">
              First 10 PII Findings ({findings.length} shown)
            </h3>
          </div>
          {findings.length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              Showing the first 10 findings in this document for review purposes.
            </p>
          )}
        </div>

        {findings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {dataset.status === 'COMPLETED' ? (
              <div>
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-[13px]">No PII found in this dataset</p>
                <p className="text-[13px] mt-1">This file appears to be clean of sensitive information</p>
              </div>
            ) : (
              <div>
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Analysis in progress</p>
                <p className="text-[13px] mt-1">Findings will appear here once analysis is complete</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {findings.map((finding) => {
              const risk = getRiskLevel(finding.confidence);
              return (
                <div key={finding.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getEntityTypeColor(finding.entityType)}>
                        {finding.entityType.replace('_', ' ')}
                      </Badge>
                      <span className={`text-[13px] font-normal ${risk.color}`}>
                        {Math.round(finding.confidence * 100)}% confidence ({risk.level} risk)
                      </span>
                    </div>
                    {finding.lineNumber && (
                      <span className="text-[13px] text-muted-foreground">
                        Line {finding.lineNumber}
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-2">
                    <Progress value={finding.confidence * 100} className="h-2" />
                  </div>

                  <div className="text-[13px]">
                    <p className="font-mono bg-background p-2 rounded border">
                      {finding.contextBefore && (
                        <span className="text-muted-foreground">{finding.contextBefore}</span>
                      )}
                      <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                        {finding.text}
                      </span>
                      {finding.contextAfter && (
                        <span className="text-muted-foreground">{finding.contextAfter}</span>
                      )}
                    </p>
                  </div>

                  <div className="text-[13px] text-muted-foreground mt-2">
                    Found at position {finding.startOffset}-{finding.endOffset} • 
                    Detected {new Date(finding.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </Card>
    </div>
  );
}