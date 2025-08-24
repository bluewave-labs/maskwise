'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ConfidenceDistribution } from '@/types/pii-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfidenceDistributionChartProps {
  data: ConfidenceDistribution[];
}

const getConfidenceColor = (range: string) => {
  switch (range) {
    case '0.9-1.0':
      return '#10b981'; // Green - Very High
    case '0.8-0.9':
      return '#059669'; // Dark Green - High
    case '0.7-0.8':
      return '#f59e0b'; // Orange - Medium
    case '0.5-0.7':
      return '#f97316'; // Dark Orange - Low
    case '0.0-0.5':
      return '#ef4444'; // Red - Very Low
    default:
      return '#6b7280'; // Gray
  }
};

export function ConfidenceDistributionChart({ data }: ConfidenceDistributionChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-3 shadow-md">
          <p className="font-medium">{data.label}</p>
          <p className="text-sm text-muted-foreground">
            Findings: {data.count.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Entity Types: {data.entityTypes}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold">Confidence Distribution</CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Distribution of PII findings by detection confidence level
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="range" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                name="Number of Findings"
                fill={(entry: ConfidenceDistribution) => getConfidenceColor(entry.range)}
              >
                {data.map((entry, index) => (
                  <Bar 
                    key={`bar-${index}`}
                    fill={getConfidenceColor(entry.range)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.map((item) => (
            <div 
              key={item.range}
              className="text-center p-3 rounded-lg border"
              style={{ backgroundColor: `${getConfidenceColor(item.range)}10` }}
            >
              <div 
                className="text-lg font-bold"
                style={{ color: getConfidenceColor(item.range) }}
              >
                {item.count.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.range.replace('-', ' - ')}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        {/* Confidence Levels Guide */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Confidence Levels:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
              <span>90-100%: Very High Confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#059669' }}></div>
              <span>80-90%: High Confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>70-80%: Medium Confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
              <span>50-70%: Low Confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span>0-50%: Very Low Confidence</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}