'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Eye, EyeOff, Shield, FileText, BarChart3, Clock, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { AnonymizationSummaryCards } from './anonymization-summary-cards';

interface AnonymizationOperation {
  start: number;
  end: number;
  entity_type: string;
  text: string;
  operator: string;
}

interface AnonymizationData {
  datasetId: string;
  anonymizedText: string;
  originalLength: number;
  anonymizedLength: number;
  operationsApplied: number;
  operations: AnonymizationOperation[];
  timestamp: string;
  format: string;
  metadata?: {
    filename: string;
    jobId: string;
    dataset: {
      id: string;
      name: string;
      filename: string;
      fileType: string;
    };
  };
}

interface AnonymizationResultsViewerProps {
  datasetId: string;
  onBack?: () => void;
  className?: string;
}

// Entity type color mapping for visual consistency
const ENTITY_COLORS = {
  EMAIL_ADDRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  PHONE_NUMBER: 'bg-green-100 text-green-800 border-green-200',
  PERSON: 'bg-purple-100 text-purple-800 border-purple-200',
  SSN: 'bg-red-100 text-red-800 border-red-200',
  CREDIT_CARD: 'bg-orange-100 text-orange-800 border-orange-200',
  DATE_TIME: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOCATION: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ORGANIZATION: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  URL: 'bg-pink-100 text-pink-800 border-pink-200',
  US_DRIVER_LICENSE: 'bg-gray-100 text-gray-800 border-gray-200',
  US_PASSPORT: 'bg-slate-100 text-slate-800 border-slate-200',
  MEDICAL_LICENSE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DEFAULT: 'bg-gray-100 text-gray-800 border-gray-200'
};

// Entity type icons for better visualization
const ENTITY_ICONS = {
  EMAIL_ADDRESS: '📧',
  PHONE_NUMBER: '📞',
  PERSON: '👤',
  SSN: '🔢',
  CREDIT_CARD: '💳',
  DATE_TIME: '📅',
  LOCATION: '📍',
  ORGANIZATION: '🏢',
  URL: '🔗',
  US_DRIVER_LICENSE: '🪪',
  US_PASSPORT: '📘',
  MEDICAL_LICENSE: '⚕️',
  DEFAULT: '🔒'
};

export function AnonymizationResultsViewer({ 
  datasetId, 
  onBack, 
  className 
}: AnonymizationResultsViewerProps) {
  const [data, setData] = useState<AnonymizationData | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<AnonymizationOperation | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchAnonymizationResults();
  }, [datasetId]);

  const fetchAnonymizationResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the API client which handles authentication automatically
      const response = await api.get(`/datasets/${datasetId}/anonymized`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load results');
      }

      setData(response.data.data);

      // TODO: Fetch original text for comparison
      // For now, we'll reconstruct it from the anonymized text and operations
      reconstructOriginalText(response.data.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (format: 'txt' | 'json' | 'csv') => {
    try {
      setDownloading(true);
      
      // Use the API client with proper authentication
      const response = await api.get(`/datasets/${datasetId}/anonymized/download?format=${format}`, {
        responseType: 'blob',
      });

      // Get the filename from data or generate one
      const datasetName = data?.metadata?.dataset.name || `Dataset_${datasetId}`;
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${datasetName.replace(/[^a-zA-Z0-9-_]/g, '_')}_anonymized_${timestamp}.${format}`;

      // Create blob and download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  // Reconstruct original text from anonymized text and operations (reverse engineering)
  const reconstructOriginalText = (data: AnonymizationData) => {
    // For demonstration, we'll use the same text but highlight the differences
    // In a real implementation, you might want to store the original text securely
    // or fetch it from a separate endpoint with proper access controls
    
    let reconstructed = data.anonymizedText;
    
    // Sort operations by position (reverse order to maintain indices)
    const sortedOps = [...data.operations].sort((a, b) => b.start - a.start);
    
    // For each operation, try to show what the original might have looked like
    // This is a simplified reconstruction for demo purposes
    sortedOps.forEach(op => {
      const beforeText = reconstructed.substring(0, op.start);
      const afterText = reconstructed.substring(op.end);
      
      // Create a placeholder for the original text based on entity type
      let originalValue = op.text;
      
      // For masked text, try to show the pattern
      if (op.operator === 'mask' && op.text.includes('*')) {
        // Keep the unmasked parts and indicate masked sections
        originalValue = op.text.replace(/\*/g, '•');
      }
      
      reconstructed = beforeText + `[${op.entity_type}:${originalValue}]` + afterText;
    });
    
    setOriginalText(reconstructed);
  };

  // Highlight text with operations
  const highlightText = (text: string, operations: AnonymizationOperation[], isOriginal = false) => {
    if (!operations.length) return <span>{text}</span>;

    const segments = [];
    let lastIndex = 0;

    // Sort operations by start position
    const sortedOps = [...operations].sort((a, b) => a.start - b.start);

    sortedOps.forEach((op, index) => {
      // Add text before this operation
      if (op.start > lastIndex) {
        segments.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, op.start)}
          </span>
        );
      }

      // Add highlighted operation
      const entityColor = ENTITY_COLORS[op.entity_type as keyof typeof ENTITY_COLORS] || ENTITY_COLORS.DEFAULT;
      const entityIcon = ENTITY_ICONS[op.entity_type as keyof typeof ENTITY_ICONS] || ENTITY_ICONS.DEFAULT;

      segments.push(
        <span
          key={`op-${index}`}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer transition-all',
            entityColor,
            selectedOperation === op ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:shadow-sm'
          )}
          onClick={() => setSelectedOperation(selectedOperation === op ? null : op)}
          title={`${op.entity_type} (${op.operator})`}
        >
          <span className="text-[13px]">{entityIcon}</span>
          <span className="font-normal">
            {text.substring(op.start, op.end)}
          </span>
        </span>
      );

      lastIndex = op.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <>{segments}</>;
  };

  // Calculate protection metrics
  const getProtectionMetrics = (data: AnonymizationData) => {
    const entityTypes = Array.from(new Set(data.operations.map(op => op.entity_type)));
    const protectionPercentage = data.operations.length > 0 
      ? Math.round((data.operations.length / (data.operations.length + 10)) * 100) // Simplified calculation
      : 0;

    return {
      entitiesFound: data.operationsApplied,
      entityTypes: entityTypes.length,
      protectionPercentage,
      uniqueTypes: entityTypes
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-[13px] text-muted-foreground">Loading anonymization results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-foreground">Failed to Load Results</h3>
            <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
            <Button 
              onClick={fetchAnonymizationResults} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-yellow-500 text-2xl">📄</div>
          <div>
            <h3 className="font-semibold text-foreground">No Results Available</h3>
            <p className="text-[13px] text-muted-foreground">Anonymization results not found for this dataset.</p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = getProtectionMetrics(data);
  
  // Calculate entity and operator breakdowns
  const entityBreakdown: Record<string, number> = {};
  const operatorBreakdown: Record<string, number> = {};
  
  data.operations.forEach(op => {
    entityBreakdown[op.entity_type] = (entityBreakdown[op.entity_type] || 0) + 1;
    operatorBreakdown[op.operator] = (operatorBreakdown[op.operator] || 0) + 1;
  });
  
  // Calculate protection score (more sophisticated calculation)
  const protectionScore = data.operations.length > 0 
    ? Math.min(1, data.operations.length / (data.originalLength / 100)) // Roughly 1 entity per 100 chars = perfect
    : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Anonymization Results</h1>
            <p className="text-[13px] text-muted-foreground">
              {data.metadata?.dataset.name || `Dataset ${datasetId}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowOriginal(!showOriginal)}
            variant="outline"
            size="sm"
          >
            {showOriginal ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Original
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Original
              </>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={downloading}>
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Downloading...' : 'Download'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadFile('txt')}>
                <FileText className="h-4 w-4 mr-2" />
                Download as TXT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadFile('json')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Download as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadFile('csv')}>
                <FileText className="h-4 w-4 mr-2" />
                Download as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <AnonymizationSummaryCards
        datasetId={datasetId}
        operationsApplied={data.operationsApplied}
        entitiesProtected={data.operations.length}
        protectionScore={protectionScore}
        originalLength={data.originalLength}
        anonymizedLength={data.anonymizedLength}
        entityBreakdown={entityBreakdown}
        operatorBreakdown={operatorBreakdown}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Text Comparison */}
        <div className="lg:col-span-2 space-y-4">
          {showOriginal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-orange-500" />
                  Original Text (Reconstructed)
                </CardTitle>
                <CardDescription>
                  Approximate reconstruction showing detected PII entities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-h-96 overflow-auto">
                  <pre className="whitespace-pre-wrap text-[13px] font-mono leading-relaxed">
                    {originalText}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Anonymized Text
              </CardTitle>
              <CardDescription>
                Protected content with PII anonymized according to policy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-96 overflow-auto">
                <div className="text-[13px] leading-relaxed">
                  {highlightText(data.anonymizedText, data.operations)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operations Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entity Types Found</CardTitle>
              <CardDescription>
                {metrics.entityTypes} different PII types detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.uniqueTypes.map((entityType) => {
                  const count = data.operations.filter(op => op.entity_type === entityType).length;
                  const icon = ENTITY_ICONS[entityType as keyof typeof ENTITY_ICONS] || ENTITY_ICONS.DEFAULT;
                  const color = ENTITY_COLORS[entityType as keyof typeof ENTITY_COLORS] || ENTITY_COLORS.DEFAULT;
                  
                  return (
                    <div key={entityType} className="flex items-center justify-between">
                      <Badge variant="outline" className={cn('text-[13px]', color)}>
                        {icon} {entityType.replace('_', ' ')}
                      </Badge>
                      <span className="text-[13px] font-normal">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedOperation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Operation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-[13px] font-normal text-muted-foreground">Entity Type</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[13px]">
                      {ENTITY_ICONS[selectedOperation.entity_type as keyof typeof ENTITY_ICONS] || ENTITY_ICONS.DEFAULT}
                    </span>
                    <Badge className={ENTITY_COLORS[selectedOperation.entity_type as keyof typeof ENTITY_COLORS] || ENTITY_COLORS.DEFAULT}>
                      {selectedOperation.entity_type}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-[13px] font-normal text-muted-foreground">Anonymization Method</label>
                  <p className="text-[13px] font-normal capitalize mt-1">{selectedOperation.operator}</p>
                </div>
                
                <div>
                  <label className="text-[13px] font-normal text-muted-foreground">Anonymized Text</label>
                  <p className="text-[13px] font-mono bg-gray-50 p-2 rounded border mt-1">
                    "{selectedOperation.text}"
                  </p>
                </div>
                
                <div>
                  <label className="text-[13px] font-normal text-muted-foreground">Position</label>
                  <p className="text-[13px] mt-1">
                    Characters {selectedOperation.start} - {selectedOperation.end}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[13px]">
              <div>
                <label className="font-normal text-muted-foreground">Job ID</label>
                <p className="font-mono text-[13px]">{data.metadata?.jobId}</p>
              </div>
              <div>
                <label className="font-normal text-muted-foreground">File Type</label>
                <p>{data.metadata?.dataset.fileType}</p>
              </div>
              <div>
                <label className="font-normal text-muted-foreground">Original Filename</label>
                <p className="break-all">{data.metadata?.dataset.filename}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}