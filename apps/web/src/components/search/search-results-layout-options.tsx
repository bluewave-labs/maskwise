'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, FileText, Calendar, Zap, Download, FileCode, BarChart, Grid, List, TrendingUp, AlertCircle, Shield, Activity, Target, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SearchResponse, SearchFinding, EntityTypeConfig } from '@/types/search';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Treemap } from 'recharts';

interface SearchResultsLayoutProps {
  results: SearchResponse;
  onPageChange: (page: number) => void;
  onViewDataset: (datasetId: string) => void;
  onExport?: (format: 'csv' | 'json') => void;
  className?: string;
}

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280'];

// Layout Option 1: Dashboard Style with Risk Assessment
export function DashboardWithRiskAssessment({
  results,
  onPageChange,
  onViewDataset,
  onExport,
  className = ''
}: SearchResultsLayoutProps) {
  const { findings, metadata, pagination, breakdown } = results;

  // Calculate risk levels
  const highRisk = breakdown.filter(b => b.avgConfidence > 0.9).reduce((sum, b) => sum + b.count, 0);
  const mediumRisk = breakdown.filter(b => b.avgConfidence > 0.7 && b.avgConfidence <= 0.9).reduce((sum, b) => sum + b.count, 0);
  const lowRisk = breakdown.filter(b => b.avgConfidence <= 0.7).reduce((sum, b) => sum + b.count, 0);

  const riskData = [
    { name: 'High Risk', value: highRisk, color: '#ef4444' },
    { name: 'Medium Risk', value: mediumRisk, color: '#f59e0b' },
    { name: 'Low Risk', value: lowRisk, color: '#10b981' }
  ];

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Hero Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{metadata.totalResults.toLocaleString()}</div>
            <div className="text-blue-100 text-[12px] mt-1">PII Findings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{breakdown.length}</div>
            <div className="text-blue-100 text-[12px] mt-1">Entity Types</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{highRisk}</div>
            <div className="text-blue-100 text-[12px] mt-1">High Risk</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{metadata.executionTime}ms</div>
            <div className="text-blue-100 text-[12px] mt-1">Search Time</div>
          </div>
        </div>
      </div>

      {/* Risk Assessment + Entity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {riskData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[12px] text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-[12px] font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Entities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Top Entity Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {breakdown.slice(0, 5).map((item, index) => {
                const config = EntityTypeConfig[item.entityType];
                const percentage = (item.count / metadata.totalResults) * 100;
                
                return (
                  <div key={item.entityType} className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-medium">{config?.label || item.entityType}</span>
                        <span className="text-[11px] text-gray-500">{item.count} findings</span>
                        <span className="text-[11px] text-gray-500">{Math.round(item.avgConfidence * 100)}% confidence</span>
                      </div>
                      <span className="text-[12px] text-gray-500">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

