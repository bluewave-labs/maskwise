'use client';

import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import { MetricCard } from '@/types/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OverviewMetricsProps {
  metrics: {
    totalDatasets: MetricCard;
    totalFindings: MetricCard;
    highRiskFiles: MetricCard;
    complianceScore: MetricCard;
  };
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    case 'down':
      return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    case 'stable':
      return <MinusIcon className="h-4 w-4 text-gray-500" />;
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    case 'stable':
      return 'text-gray-500';
  }
};

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[13px] font-medium">{metric.title}</CardTitle>
        {getTrendIcon(metric.trend)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">
          <span className={getTrendColor(metric.trend)}>
            {metric.change > 0 ? '+' : ''}{metric.change}%
          </span>
          {' '}
          {metric.changeLabel}
        </p>
      </CardContent>
    </Card>
  );
}

export function OverviewMetrics({ metrics }: OverviewMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCardComponent metric={metrics.totalDatasets} />
      <MetricCardComponent metric={metrics.totalFindings} />
      <MetricCardComponent metric={metrics.highRiskFiles} />
      <MetricCardComponent metric={metrics.complianceScore} />
    </div>
  );
}