'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { JobPerformanceStats } from '@/types/pii-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  ListIcon,
  PlayIcon 
} from 'lucide-react';

interface JobPerformanceDashboardProps {
  data: JobPerformanceStats[];
}

const JOB_TYPE_COLORS = {
  'EXTRACT_TEXT': '#3b82f6',    // Blue
  'ANALYZE_PII': '#10b981',     // Green
  'ANONYMIZE': '#f59e0b',       // Orange
  'GENERATE_REPORT': '#8b5cf6'  // Purple
};

const JOB_TYPE_LABELS = {
  'EXTRACT_TEXT': 'Text Extraction',
  'ANALYZE_PII': 'PII Analysis',
  'ANONYMIZE': 'Anonymization', 
  'GENERATE_REPORT': 'Report Generation'
};

export function JobPerformanceDashboard({ data }: JobPerformanceDashboardProps) {
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
          <p className="font-medium">{JOB_TYPE_LABELS[data.jobType as keyof typeof JOB_TYPE_LABELS]}</p>
          <p className="text-sm text-muted-foreground">
            Total Jobs: {data.totalJobs.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Success Rate: {data.successRate}%
          </p>
          <p className="text-sm text-muted-foreground">
            Avg Processing: {formatProcessingTime(data.avgProcessingTimeMs)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Prepare chart data
  const chartData = data.map(job => ({
    ...job,
    jobTypeLabel: JOB_TYPE_LABELS[job.jobType as keyof typeof JOB_TYPE_LABELS] || job.jobType
  }));

  return (
    <div className="space-y-6">
      {/* Job Success Rates Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">Job Success Rates by Type</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Success rate percentage for different job types
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="jobTypeLabel" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="successRate" name="Success Rate (%)">
                  {data.map((entry, index) => (
                    <Bar 
                      key={`bar-${index}`}
                      fill={JOB_TYPE_COLORS[entry.jobType as keyof typeof JOB_TYPE_COLORS] || '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Job Performance Details */}
      <div className="grid gap-6">
        {data.map((job) => (
          <Card key={job.jobType}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: JOB_TYPE_COLORS[job.jobType as keyof typeof JOB_TYPE_COLORS] || '#6b7280' }}
                  />
                  {JOB_TYPE_LABELS[job.jobType as keyof typeof JOB_TYPE_LABELS] || job.jobType}
                </CardTitle>
                <Badge variant={job.successRate >= 95 ? 'default' : job.successRate >= 80 ? 'secondary' : 'destructive'}>
                  {job.successRate}% Success
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ListIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{job.totalJobs.toLocaleString()}</span>
                  </div>
                  <div className="text-[13px] text-muted-foreground">Total Jobs</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">{job.completed.toLocaleString()}</span>
                  </div>
                  <div className="text-[13px] text-muted-foreground">Completed</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <XCircleIcon className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold text-red-600">{job.failed.toLocaleString()}</span>
                  </div>
                  <div className="text-[13px] text-muted-foreground">Failed</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <PlayIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">{job.running.toLocaleString()}</span>
                  </div>
                  <div className="text-[13px] text-muted-foreground">Running</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ClockIcon className="h-4 w-4 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-600">
                      {formatProcessingTime(job.avgProcessingTimeMs)}
                    </span>
                  </div>
                  <div className="text-[13px] text-muted-foreground">Avg Time</div>
                </div>
              </div>

              {/* Success Rate Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium">Success Rate</span>
                  <span className="text-[13px] text-muted-foreground">{job.successRate}%</span>
                </div>
                <Progress value={job.successRate} className="h-2" />
              </div>

              {/* Common Errors */}
              {Object.keys(job.commonErrors).length > 0 && (
                <div>
                  <h4 className="text-[13px] font-medium mb-3">Common Errors</h4>
                  <div className="space-y-2">
                    {Object.entries(job.commonErrors)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([error, count]) => (
                        <div key={error} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-[13px] text-muted-foreground truncate flex-1 mr-2">
                            {error}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Processing Time Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">Average Processing Time by Job Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="jobTypeLabel" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatProcessingTime}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: any) => [formatProcessingTime(value), 'Processing Time']}
                />
                <Bar dataKey="avgProcessingTimeMs" name="Avg Processing Time">
                  {data.map((entry, index) => (
                    <Bar 
                      key={`bar-${index}`}
                      fill={JOB_TYPE_COLORS[entry.jobType as keyof typeof JOB_TYPE_COLORS] || '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}