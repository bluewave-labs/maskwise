'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PIIDistribution } from '@/types/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PIIDistributionChartProps {
  data: PIIDistribution[];
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

export function PIIDistributionChart({ data, onEntityClick }: PIIDistributionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-3 shadow-md text-[13px]">
          <p className="font-medium">{data.entityType}</p>
          <p className="text-muted-foreground">
            Count: {data.count.toLocaleString()}
          </p>
          <p className="text-muted-foreground">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
          <p className="text-muted-foreground">
            Risk Level: <span className="font-medium" style={{ color: getRiskColor(data.riskLevel) }}>
              {data.riskLevel.toUpperCase()}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload?.map((entry: any, index: number) => (
          <div 
            key={`legend-${index}`} 
            className="flex items-center gap-1 text-[13px] cursor-pointer hover:opacity-80"
            onClick={() => onEntityClick?.(entry.payload.entityType)}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleCellClick = (data: PIIDistribution) => {
    onEntityClick?.(data.entityType);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold">PII Distribution by Risk Level</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="entityType"
                onClick={handleCellClick}
                style={{ cursor: onEntityClick ? 'pointer' : 'default' }}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getRiskColor(entry.riskLevel)}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-[13px] text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Risk Levels:</span>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>High Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Medium Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Low Risk</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}