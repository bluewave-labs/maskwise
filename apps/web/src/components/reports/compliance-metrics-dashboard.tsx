'use client';

import { ComplianceMetric } from '@/types/compliance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  XCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon
} from 'lucide-react';

interface ComplianceMetricsDashboardProps {
  data: ComplianceMetric[];
}

const STATUS_ICONS = {
  compliant: CheckCircleIcon,
  warning: AlertTriangleIcon,
  violation: XCircleIcon,
};

const STATUS_COLORS = {
  compliant: 'text-green-600',
  warning: 'text-yellow-600',
  violation: 'text-red-600',
};

const TREND_ICONS = {
  up: TrendingUpIcon,
  down: TrendingDownIcon,
  stable: MinusIcon,
};

const TREND_COLORS = {
  up: 'text-green-600',
  down: 'text-red-600',
  stable: 'text-gray-600',
};

export function ComplianceMetricsDashboard({ data }: ComplianceMetricsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.map((metric) => {
          const StatusIcon = STATUS_ICONS[metric.status];
          const TrendIcon = TREND_ICONS[metric.trend];
          const statusColor = STATUS_COLORS[metric.status];
          const trendColor = TREND_COLORS[metric.trend];
          
          return (
            <Card key={metric.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                    <Badge 
                      variant={metric.status === 'compliant' ? 'default' : 
                              metric.status === 'warning' ? 'secondary' : 'destructive'}
                    >
                      {metric.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-[13px] font-medium text-muted-foreground">
                    {metric.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {metric.name.includes('Rate') || metric.name.includes('Coverage') 
                        ? `${metric.value}%` 
                        : metric.value
                      }
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      / {metric.name.includes('Rate') || metric.name.includes('Coverage') 
                        ? `${metric.target}%` 
                        : metric.target
                      }
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Progress</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track progress toward compliance targets
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.map((metric) => {
              const percentage = Math.min((metric.value / metric.target) * 100, 100);
              const isOverTarget = metric.value > metric.target && metric.name.includes('Findings');
              
              return (
                <div key={metric.name} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          metric.status === 'compliant' ? 'bg-green-500' :
                          metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium">{metric.name}</span>
                      </div>
                      <Badge 
                        variant={metric.status === 'compliant' ? 'default' : 
                                metric.status === 'warning' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {metric.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold">
                        {metric.name.includes('Rate') || metric.name.includes('Coverage') 
                          ? `${metric.value}%` 
                          : metric.value
                        }
                      </span>
                      <span className="text-muted-foreground">
                        / {metric.name.includes('Rate') || metric.name.includes('Coverage') 
                          ? `${metric.target}%` 
                          : metric.target
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress 
                      value={isOverTarget ? 100 : percentage} 
                      className="h-2"
                    />
                    {isOverTarget && (
                      <div className="text-xs text-red-600 font-medium">
                        Exceeds target by {metric.value - metric.target}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[13px] text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}