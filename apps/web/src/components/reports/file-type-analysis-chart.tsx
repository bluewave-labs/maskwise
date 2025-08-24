'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { FileTypeAnalysis } from '@/types/pii-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FileTypeAnalysisChartProps {
  data: FileTypeAnalysis[];
  onFileTypeClick?: (fileType: string) => void;
}

export function FileTypeAnalysisChart({ data, onFileTypeClick }: FileTypeAnalysisChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-3 shadow-md text-[13px]">
          <p className="font-medium">{data.fileType} Files</p>
          <p className="text-muted-foreground">
            Datasets: {data.datasetCount}
          </p>
          <p className="text-muted-foreground">
            PII Findings: {data.findingsCount.toLocaleString()}
          </p>
          <p className="text-muted-foreground">
            Total Size: {data.totalSizeMB.toFixed(1)} MB
          </p>
          <p className="text-muted-foreground">
            PII Density: {data.piiDensity.toFixed(2)} findings/MB
          </p>
          <p className="text-muted-foreground">
            Avg Findings/File: {data.avgFindingsPerFile.toFixed(1)}
          </p>
        </div>
      );
    }
    return null;
  };

  const scatterData = data.map(item => ({
    ...item,
    x: item.totalSizeMB,
    y: item.piiDensity,
  }));

  const handleBarClick = (data: FileTypeAnalysis) => {
    onFileTypeClick?.(data.fileType);
  };

  return (
    <div className="space-y-4">
      {/* Findings by File Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">PII Findings by File Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="fileType" 
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
                  dataKey="findingsCount" 
                  name="PII Findings"
                  fill="hsl(221.2 83.2% 53.3%)"
                  onClick={handleBarClick}
                  style={{ cursor: onFileTypeClick ? 'pointer' : 'default' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* PII Density vs File Size */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">PII Density vs File Size</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Relationship between file size and PII density (findings per MB)
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="File Size (MB)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="PII Density (findings/MB)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter 
                  dataKey="findingsCount" 
                  fill="hsl(221.2 83.2% 53.3%)"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* File Type Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>File Type Analysis Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.map((fileType) => (
              <div
                key={fileType.fileType}
                className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${
                  onFileTypeClick ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
                onClick={() => onFileTypeClick?.(fileType.fileType)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="font-medium text-lg">{fileType.fileType}</h4>
                    <Badge variant="outline" className="text-xs">
                      {fileType.datasetCount} files
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {fileType.findingsCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">PII Findings</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {fileType.totalSizeMB.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">MB Total Size</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {fileType.piiDensity.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Findings/MB</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {fileType.avgFindingsPerFile.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg/File</div>
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