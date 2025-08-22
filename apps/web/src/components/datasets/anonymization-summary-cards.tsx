'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  FileText,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Eye,
  Lock,
  FileSearch,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnonymizationSummaryCardsProps {
  datasetId?: string;
  operationsApplied?: number;
  entitiesProtected?: number;
  protectionScore?: number;
  originalLength?: number;
  anonymizedLength?: number;
  entityBreakdown?: Record<string, number>;
  operatorBreakdown?: Record<string, number>;
  processingTime?: number;
  className?: string;
}

// Entity type color mapping for consistency
const ENTITY_COLORS: Record<string, string> = {
  EMAIL_ADDRESS: 'text-blue-600',
  PHONE_NUMBER: 'text-green-600',
  PERSON: 'text-purple-600',
  SSN: 'text-red-600',
  CREDIT_CARD: 'text-orange-600',
  DATE_TIME: 'text-yellow-600',
  LOCATION: 'text-indigo-600',
  ORGANIZATION: 'text-cyan-600',
  URL: 'text-pink-600',
  DEFAULT: 'text-gray-600'
};

// Operator type icons
const OPERATOR_ICONS: Record<string, any> = {
  redact: Shield,
  mask: Eye,
  replace: FileText,
  encrypt: Lock,
  DEFAULT: Activity
};

export function AnonymizationSummaryCards({
  datasetId,
  operationsApplied = 0,
  entitiesProtected = 0,
  protectionScore = 0,
  originalLength = 0,
  anonymizedLength = 0,
  entityBreakdown = {},
  operatorBreakdown = {},
  processingTime = 0,
  className
}: AnonymizationSummaryCardsProps) {
  // Calculate protection percentage
  const protectionPercentage = Math.min(100, Math.round(protectionScore * 100));
  
  // Calculate text reduction percentage
  const textReduction = originalLength > 0 
    ? Math.round(((originalLength - anonymizedLength) / originalLength) * 100)
    : 0;

  // Get top entities
  const topEntities = Object.entries(entityBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Get protection level label
  const getProtectionLevel = (score: number) => {
    if (score >= 0.9) return { label: 'Excellent', color: 'text-green-600', icon: CheckCircle2 };
    if (score >= 0.7) return { label: 'Good', color: 'text-blue-600', icon: CheckCircle2 };
    if (score >= 0.5) return { label: 'Fair', color: 'text-yellow-600', icon: AlertTriangle };
    return { label: 'Poor', color: 'text-red-600', icon: AlertTriangle };
  };

  const protectionLevel = getProtectionLevel(protectionScore);
  const ProtectionIcon = protectionLevel.icon;

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {/* Protection Score Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-50" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Protection Score
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{protectionPercentage}%</span>
              <Badge variant="outline" className={cn('text-xs', protectionLevel.color)}>
                <ProtectionIcon className="h-3 w-3 mr-1" />
                {protectionLevel.label}
              </Badge>
            </div>
            <Progress value={protectionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {entitiesProtected} entities protected
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Operations Applied Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-50" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            Operations Applied
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{operationsApplied}</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="space-y-1">
              {Object.entries(operatorBreakdown).map(([operator, count]) => {
                const Icon = OPERATOR_ICONS[operator] || OPERATOR_ICONS.DEFAULT;
                return (
                  <div key={operator} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {operator}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity Breakdown Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-50" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            Top Protected Entities
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{Object.keys(entityBreakdown).length}</span>
              <span className="text-xs text-muted-foreground">types</span>
            </div>
            <div className="space-y-2">
              {topEntities.map(([entity, count]) => (
                <div key={entity} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-medium', ENTITY_COLORS[entity] || ENTITY_COLORS.DEFAULT)}>
                      {entity.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <Progress 
                    value={(count / Math.max(...Object.values(entityBreakdown))) * 100} 
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Metrics Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-50" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-orange-600" />
            Processing Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Text Reduction</span>
                <span className="text-sm font-bold">{textReduction}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Original Size</span>
                <span className="text-sm font-medium">{originalLength.toLocaleString()} chars</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Anonymized Size</span>
                <span className="text-sm font-medium">{anonymizedLength.toLocaleString()} chars</span>
              </div>
              {processingTime > 0 && (
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-muted-foreground">Processing Time</span>
                  <span className="text-sm font-medium">{(processingTime / 1000).toFixed(2)}s</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}