'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityTypeConfig } from '@/types/search';

interface EntityTypesPieChartProps {
  breakdown: Array<{
    entityType: string;
    count: number;
    avgConfidence: number;
  }>;
  className?: string;
}

const CHART_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red  
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#6b7280', // Gray
];

export function EntityTypesPieChart({ breakdown, className = '' }: EntityTypesPieChartProps) {
  // Safety check for breakdown array
  if (!breakdown || !Array.isArray(breakdown)) {
    breakdown = [];
  }

  // Transform data for pie chart with safety checks
  const pieData = breakdown
    .filter(item => item && typeof item === 'object' && item.entityType)
    .map((item, index) => ({
      name: EntityTypeConfig[item.entityType]?.label || item.entityType || 'Unknown',
      value: item.count || 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
      confidence: Math.round((item.avgConfidence || 0) * 100),
      icon: EntityTypeConfig[item.entityType]?.icon || '📄',
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-[13px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">{data.icon || '📄'}</span>
            <span className="font-medium text-gray-900">{data.name || 'Unknown'}</span>
          </div>
          <p className="text-gray-600">
            Findings: <span className="font-medium">{(data.value || 0).toLocaleString()}</span>
          </p>
          <p className="text-gray-600">
            Avg Confidence: <span className="font-medium">{data.confidence || 0}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label function for pie slices - positioned outside
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // Position labels outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Only show label if the slice is large enough (more than 10% of total)
    const total = pieData.reduce((sum, entry) => sum + entry.value, 0);
    const percentage = (value / total) * 100;
    
    if (percentage < 10) return null;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="11"
        fontWeight="500"
      >
        {name}: {value}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 gap-1 mt-4">
        {payload.slice(0, 5).map((entry: any, index: number) => {
          // Safety checks for entry properties
          if (!entry || !entry.payload) return null;
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color || '#6b7280' }}
              />
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px]">{entry.payload.icon || '📄'}</span>
                <span className="text-[11px] text-gray-700 truncate">{entry.value || 'Unknown'}</span>
              </div>
              <span className="text-[10px] font-medium text-gray-900">
                {entry.payload?.value?.toLocaleString() || '0'}
              </span>
            </div>
          );
        }).filter(Boolean)}
        {payload.length > 5 && (
          <div className="text-[10px] text-gray-400 text-center pt-1 border-t border-gray-100">
            +{payload.length - 5} more types
          </div>
        )}
      </div>
    );
  };

  if (breakdown.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-medium text-gray-900">Entity Types</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-[32px] mb-2">📊</div>
            <p className="text-[11px] text-gray-500">No entity types found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] font-medium text-gray-900">Entity Types</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[280px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="40%"
                outerRadius={55}
                innerRadius={20}
                paddingAngle={2}
                label={renderCustomLabel}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Custom Legend */}
        <div className="px-4 pb-4">
          <CustomLegend payload={pieData} />
        </div>
      </CardContent>
    </Card>
  );
}