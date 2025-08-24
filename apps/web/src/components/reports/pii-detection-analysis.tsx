'use client';

import { useEffect, useState } from 'react';
import { RefreshCwIcon, FilterIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePIIAnalysisData } from '@/hooks/usePIIAnalysisData';
import { EntityTypeBreakdownChart } from './entity-type-breakdown';
import { ConfidenceDistributionChart } from './confidence-distribution-chart';
import { FileTypeAnalysisChart } from './file-type-analysis-chart';
import { DetectionPerformanceDashboard } from './detection-performance-dashboard';
import { JobPerformanceDashboard } from './job-performance-dashboard';
import { DateRangeSelector } from './date-range-selector';
import { PIIAnalysisQueryParams } from '@/types/pii-analysis';

export function PIIDetectionAnalysis() {
  const { data, loading, error, refresh } = usePIIAnalysisData();
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const router = useRouter();

  // Initial data load
  useEffect(() => {
    refresh({ 
      range: selectedRange,
      entityType: selectedEntityType || undefined,
      fileType: selectedFileType || undefined
    });
  }, [refresh, selectedRange, selectedEntityType, selectedFileType]);

  const handleRangeChange = (range: '7d' | '30d' | '90d' | 'all') => {
    setSelectedRange(range);
  };

  const handleRefresh = () => {
    refresh({ 
      range: selectedRange,
      entityType: selectedEntityType || undefined,
      fileType: selectedFileType || undefined
    });
  };

  const handleEntityClick = (entityType: string) => {
    // Drill down to datasets filtered by entity type
    router.push(`/datasets?entityType=${encodeURIComponent(entityType)}`);
  };

  const handleFileTypeClick = (fileType: string) => {
    // Drill down to datasets filtered by file type
    router.push(`/datasets?fileType=${encodeURIComponent(fileType)}`);
  };

  const clearFilters = () => {
    setSelectedEntityType(null);
    setSelectedFileType(null);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">PII Detection & Analysis</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load PII analysis data: {error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">PII Detection & Analysis</h2>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range & Filters */}
      <div className="space-y-4">
        <DateRangeSelector
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
          dateRange={data?.dateRange}
        />

        {/* Additional Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] font-medium">Filters:</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted-foreground">Entity Type:</span>
                  <Select
                    value={selectedEntityType || 'all'}
                    onValueChange={(value) => setSelectedEntityType(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {data?.entityBreakdown.map((entity) => (
                        <SelectItem key={entity.entityType} value={entity.entityType}>
                          {entity.entityType.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted-foreground">File Type:</span>
                  <Select
                    value={selectedFileType || 'all'}
                    onValueChange={(value) => setSelectedFileType(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="All Files" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Files</SelectItem>
                      {data?.fileTypeAnalysis.map((file) => (
                        <SelectItem key={file.fileType} value={file.fileType}>
                          {file.fileType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(selectedEntityType || selectedFileType) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
            <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
          <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
        </div>
      ) : data ? (
        <>
          {/* Main Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <EntityTypeBreakdownChart 
              data={data.entityBreakdown}
              onEntityClick={handleEntityClick}
            />
            <ConfidenceDistributionChart data={data.confidenceDistribution} />
          </div>

          {/* File Type Analysis */}
          <FileTypeAnalysisChart 
            data={data.fileTypeAnalysis}
            onFileTypeClick={handleFileTypeClick}
          />

          {/* Performance Dashboards */}
          <DetectionPerformanceDashboard data={data.detectionPerformance} />
          
          <JobPerformanceDashboard data={data.jobPerformance} />
        </>
      ) : null}
    </div>
  );
}