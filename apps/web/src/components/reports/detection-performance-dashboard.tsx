'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DetectionPerformance } from '@/types/pii-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircleIcon, XCircleIcon, ClockIcon, DatabaseIcon } from 'lucide-react';

interface DetectionPerformanceDashboardProps {
  data: DetectionPerformance;
}

const EXTRACTION_METHOD_COLORS = {
  'tika': '#3b82f6',   // Blue
  'ocr': '#10b981',    // Green  
  'direct': '#f59e0b', // Orange
  'hybrid': '#8b5cf6', // Purple
  'unknown': '#6b7280' // Gray
};

export function DetectionPerformanceDashboard({ data }: DetectionPerformanceDashboardProps) {
  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-3 shadow-md">
          <p className="font-medium">{data.method.charAt(0).toUpperCase() + data.method.slice(1)} Method</p>
          <p className="text-sm text-muted-foreground">
            Datasets: {data.count}
          </p>
          <p className="text-sm text-muted-foreground">
            Avg Confidence: {data.avgConfidence.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Usage Rate: {data.successRate}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DatabaseIcon className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{data.totalDatasets.toLocaleString()}</div>
                <div className="text-[13px] text-muted-foreground">Total Datasets</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{data.successfulJobs.toLocaleString()}</div>
                <div className="text-[13px] text-muted-foreground">Successful Jobs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircleIcon className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{data.failedJobs.toLocaleString()}</div>
                <div className="text-[13px] text-muted-foreground">Failed Jobs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{formatProcessingTime(data.avgProcessingTimeMs)}</div>
                <div className="text-[13px] text-muted-foreground">Avg Processing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">Overall Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={data.successRate} className="w-full h-3" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {data.successRate}%
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground mt-2">
            {data.successfulJobs} successful out of {data.successfulJobs + data.failedJobs} total processing jobs
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Extraction Methods Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-bold">Text Extraction Methods</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Distribution of text extraction methods used across datasets
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.extractionMethods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="method" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Dataset Count">
                    {data.extractionMethods.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={EXTRACTION_METHOD_COLORS[entry.method as keyof typeof EXTRACTION_METHOD_COLORS] || EXTRACTION_METHOD_COLORS.unknown}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Extraction Methods Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-bold">Method Usage Distribution</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Percentage breakdown of extraction method usage
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.extractionMethods}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    nameKey="method"
                  >
                    {data.extractionMethods.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={EXTRACTION_METHOD_COLORS[entry.method as keyof typeof EXTRACTION_METHOD_COLORS] || EXTRACTION_METHOD_COLORS.unknown}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.extractionMethods.map((method) => (
                <div key={method.method} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: EXTRACTION_METHOD_COLORS[method.method as keyof typeof EXTRACTION_METHOD_COLORS] || EXTRACTION_METHOD_COLORS.unknown }}
                  />
                  <span className="text-[13px]">
                    {method.method.charAt(0).toUpperCase() + method.method.slice(1)} ({method.count})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extraction Method Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">Extraction Method Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.extractionMethods.map((method) => (
              <div key={method.method} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: EXTRACTION_METHOD_COLORS[method.method as keyof typeof EXTRACTION_METHOD_COLORS] || EXTRACTION_METHOD_COLORS.unknown }}
                  />
                  <div>
                    <div className="font-medium">
                      {method.method.charAt(0).toUpperCase() + method.method.slice(1)} Extraction
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      Used in {method.count} datasets ({method.successRate}% of total)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{method.avgConfidence.toFixed(1)}%</div>
                  <div className="text-[13px] text-muted-foreground">Avg Confidence</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}