'use client';

import { useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useOverviewData } from '@/hooks/useOverviewData';
import { OverviewMetrics } from './overview-metrics';
import { ProcessingTrendsChart } from './processing-trends-chart';
import { PIIDistributionChart } from './pii-distribution-chart';
import { RecentHighRiskFindings } from './recent-high-risk-findings';
import { DateRangeSelector } from './date-range-selector';
import { OverviewQueryParams } from '@/types/reports';

export function OverviewInsights() {
  const { data, loading, error, refresh } = useOverviewData();
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const router = useRouter();

  // Initial data load
  useEffect(() => {
    refresh({ range: selectedRange });
  }, [refresh, selectedRange]);

  const handleRangeChange = (range: '7d' | '30d' | '90d' | 'all') => {
    setSelectedRange(range);
    refresh({ range });
  };

  const handleRefresh = () => {
    refresh({ range: selectedRange });
  };

  const handleEntityClick = (entityType: string) => {
    // Drill down to datasets filtered by entity type
    router.push(`/datasets?entityType=${encodeURIComponent(entityType)}`);
  };

  const handleFindingClick = (datasetId: string) => {
    // Navigate to specific dataset findings
    router.push(`/datasets/${datasetId}`);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Overview & Insights</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load overview data: {error}</p>
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
      {/* Header with Manual Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Overview & Insights</h2>
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

      {/* Date Range Selector */}
      <DateRangeSelector
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
        dateRange={data?.dateRange}
      />

      {loading && !data ? (
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-[350px] bg-muted animate-pulse rounded-lg" />
            <div className="h-[350px] bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
        </div>
      ) : data ? (
        <>
          {/* Metrics Cards */}
          <OverviewMetrics metrics={data.metrics} />

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <ProcessingTrendsChart data={data.processingTrends} />
            <PIIDistributionChart 
              data={data.piiDistribution}
              onEntityClick={handleEntityClick}
            />
          </div>

          {/* Recent High-Risk Findings */}
          <RecentHighRiskFindings 
            data={data.recentHighRiskFindings}
            onFindingClick={handleFindingClick}
          />
        </>
      ) : null}
    </div>
  );
}