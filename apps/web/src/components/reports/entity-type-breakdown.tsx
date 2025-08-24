'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { EntityTypeBreakdown } from '@/types/pii-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EntityTypeBreakdownProps {
  data: EntityTypeBreakdown[];
  onEntityClick?: (entityType: string) => void;
}

const getRiskColor = (riskLevel: 'high' | 'medium' | 'low') => {
  switch (riskLevel) {
    case 'high':
      return '#ef4444'; // Red
    case 'medium':
      return '#f59e0b'; // Yellow/Orange
    case 'low':
      return '#10b981'; // Green
  }
};

const getRiskColorLight = (riskLevel: 'high' | 'medium' | 'low') => {
  switch (riskLevel) {
    case 'high':
      return '#fef2f2'; // Red light
    case 'medium':
      return '#fffbeb'; // Yellow/Orange light
    case 'low':
      return '#f0fdf4'; // Green light
  }
};

export function EntityTypeBreakdownChart({ data, onEntityClick }: EntityTypeBreakdownProps) {
  const formatEntityType = (entityType: string) => {
    return entityType.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-3 shadow-md">
          <p className="font-medium">{formatEntityType(data.entityType)}</p>
          <p className="text-sm text-muted-foreground">
            Count: {data.count.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Avg Confidence: {Math.round(data.avgConfidence * 100)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Risk Level: <span className="font-medium" style={{ color: getRiskColor(data.riskLevel) }}>
              {data.riskLevel.toUpperCase()}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data: EntityTypeBreakdown) => {
    onEntityClick?.(data.entityType);
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">Entity Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="entityType" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatEntityType(value).split(' ')[0]}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  name="PII Findings"
                  onClick={handleBarClick}
                  style={{ cursor: onEntityClick ? 'pointer' : 'default' }}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getRiskColor(entry.riskLevel)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">Entity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((entity) => (
              <div
                key={entity.entityType}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  onEntityClick ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
                style={{ backgroundColor: getRiskColorLight(entity.riskLevel) }}
                onClick={() => onEntityClick?.(entity.entityType)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[13px]">{formatEntityType(entity.entityType)}</p>
                      <Badge 
                        variant={entity.riskLevel === 'high' ? 'destructive' : entity.riskLevel === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {entity.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">{entity.count.toLocaleString()}</span> findings
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{entity.percentage.toFixed(1)}%</span> of total
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{Math.round(entity.avgConfidence * 100)}%</span> confidence
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}