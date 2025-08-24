'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PolicyEffectiveness } from '@/types/compliance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheckIcon, 
  FileTextIcon, 
  AlertTriangleIcon,
  CheckCircleIcon 
} from 'lucide-react';

interface PolicyEffectivenessChartProps {
  data: PolicyEffectiveness[];
  onPolicyClick?: (policyId: string) => void;
}

const EFFECTIVENESS_COLORS = {
  excellent: '#10b981', // Green
  good: '#3b82f6',      // Blue
  fair: '#f59e0b',      // Orange
  poor: '#ef4444',      // Red
};

export function PolicyEffectivenessChart({ data, onPolicyClick }: PolicyEffectivenessChartProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getEffectivenessLevel = (score: number) => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  };

  const getEffectivenessLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-3 shadow-md">
          <p className="font-medium">{data.policyName}</p>
          <p className="text-sm text-muted-foreground">
            Version: {data.version}
          </p>
          <p className="text-sm text-muted-foreground">
            Effectiveness: {data.effectivenessScore}%
          </p>
          <p className="text-sm text-muted-foreground">
            Applied to: {data.appliedDatasets} datasets
          </p>
          <p className="text-sm text-muted-foreground">
            High-risk findings: {data.highRiskFindings}
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = data.map(policy => ({
    ...policy,
    fill: EFFECTIVENESS_COLORS[getEffectivenessLevel(policy.effectivenessScore)],
  }));

  const handleBarClick = (data: PolicyEffectiveness) => {
    onPolicyClick?.(data.policyId);
  };

  return (
    <div className="space-y-6">
      {/* Effectiveness Score Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-bold">Policy Effectiveness Scores</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Effectiveness based on high-risk findings ratio and application success
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="policyName" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="effectivenessScore" 
                  name="Effectiveness (%)"
                  onClick={handleBarClick}
                  style={{ cursor: onPolicyClick ? 'pointer' : 'default' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Policy Details Cards */}
      <div className="grid gap-4">
        {data.map((policy) => {
          const effectivenessLevel = getEffectivenessLevel(policy.effectivenessScore);
          const effectivenessLabel = getEffectivenessLabel(policy.effectivenessScore);
          
          return (
            <Card 
              key={policy.policyId}
              className={`transition-colors ${
                onPolicyClick ? 'cursor-pointer hover:bg-muted/50' : ''
              }`}
              onClick={() => onPolicyClick?.(policy.policyId)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheckIcon className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">{policy.policyName}</h3>
                        <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Version {policy.version}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold" style={{ 
                        color: EFFECTIVENESS_COLORS[effectivenessLevel] 
                      }}>
                        {policy.effectivenessScore}%
                      </span>
                    </div>
                    <Badge 
                      variant={effectivenessLevel === 'excellent' || effectivenessLevel === 'good' ? 'default' : 
                              effectivenessLevel === 'fair' ? 'secondary' : 'destructive'}
                    >
                      {effectivenessLabel}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{policy.appliedDatasets}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Applied Datasets</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-lg font-semibold text-blue-600">{policy.totalFindings}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Total Findings</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
                      <span className="text-lg font-semibold text-orange-600">{policy.highRiskFindings}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">High-Risk</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold text-muted-foreground">
                      {formatDate(policy.lastApplied)}
                    </div>
                    <div className="text-xs text-muted-foreground">Last Applied</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}