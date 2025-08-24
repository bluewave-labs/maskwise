'use client';

import { useState } from 'react';
import { RefreshCwIcon, FilterIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useComplianceData } from '@/hooks/useComplianceData';
import { ComplianceMetricsDashboard } from './compliance-metrics-dashboard';
import { PolicyEffectivenessChart } from './policy-effectiveness-chart';
import { AuditTrailViewer } from './audit-trail-viewer';
import { RiskAssessmentDashboard } from './risk-assessment-dashboard';
import { DateRangeSelector } from './date-range-selector';
import { ComplianceQueryParams } from '@/types/compliance';

export function ComplianceRiskTab() {
  const { data, loading, error, refresh } = useComplianceData();
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const router = useRouter();

  const handleRangeChange = (range: '7d' | '30d' | '90d' | 'all') => {
    setSelectedRange(range);
    refresh({ 
      range,
      policyName: selectedPolicyName || undefined,
      action: selectedAction || undefined,
    });
  };

  const handleRefresh = () => {
    refresh({ 
      range: selectedRange,
      policyName: selectedPolicyName || undefined,
      action: selectedAction || undefined,
    });
  };

  const handleFilterChange = () => {
    refresh({ 
      range: selectedRange,
      policyName: selectedPolicyName || undefined,
      action: selectedAction || undefined,
    });
  };

  const handlePolicyClick = (policyId: string) => {
    // Navigate to policies page with this policy selected
    router.push(`/policies?id=${encodeURIComponent(policyId)}`);
  };

  const clearFilters = () => {
    setSelectedPolicyName('');
    setSelectedAction('');
    refresh({ range: selectedRange });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Compliance & Risk Assessment</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load compliance data: {error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">Compliance & Risk Assessment</h2>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range & Filters */}
      <div className="space-y-4">
        <DateRangeSelector
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
          dateRange={data?.dateRange}
        />

        {/* Additional Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] font-medium">Filters:</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted-foreground">Policy:</span>
                  <Input
                    placeholder="Filter by policy name..."
                    value={selectedPolicyName}
                    onChange={(e) => setSelectedPolicyName(e.target.value)}
                    onBlur={handleFilterChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
                    className="w-[180px] h-8"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted-foreground">Action:</span>
                  <Select
                    value={selectedAction || 'all'}
                    onValueChange={(value) => {
                      const newAction = value === 'all' ? '' : value;
                      setSelectedAction(newAction);
                      refresh({ 
                        range: selectedRange,
                        policyName: selectedPolicyName || undefined,
                        action: newAction || undefined,
                      });
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="LOGIN">Login</SelectItem>
                      <SelectItem value="DATASET_CREATED">Dataset Created</SelectItem>
                      <SelectItem value="DATASET_UPDATED">Dataset Updated</SelectItem>
                      <SelectItem value="DATASET_DELETED">Dataset Deleted</SelectItem>
                      <SelectItem value="POLICY_CREATED">Policy Created</SelectItem>
                      <SelectItem value="POLICY_UPDATED">Policy Updated</SelectItem>
                      <SelectItem value="JOB_COMPLETED">Job Completed</SelectItem>
                      <SelectItem value="JOB_FAILED">Job Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(selectedPolicyName || selectedAction) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="h-[120px] bg-muted animate-pulse rounded-lg" />
            <div className="h-[120px] bg-muted animate-pulse rounded-lg" />
            <div className="h-[120px] bg-muted animate-pulse rounded-lg" />
            <div className="h-[120px] bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
            <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Risk Assessment Overview */}
          <RiskAssessmentDashboard data={data.riskAssessment} />

          {/* Compliance Metrics */}
          <ComplianceMetricsDashboard data={data.metrics} />

          {/* Policy Effectiveness and Audit Trail */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <PolicyEffectivenessChart 
                data={data.policyEffectiveness}
                onPolicyClick={handlePolicyClick}
              />
            </div>
            <div>
              <AuditTrailViewer data={data.auditTrail} />
            </div>
          </div>

          {/* Data Retention Metrics */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-[15px] font-semibold mb-4">Data Retention Compliance</h3>
              <div className="grid gap-4">
                {data.dataRetention.map((retention) => (
                  <div 
                    key={retention.category}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{retention.category}</div>
                      <div className="text-[13px] text-muted-foreground">
                        {retention.totalRecords} total records • {retention.retentionPeriod} retention
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${
                          retention.complianceStatus === 'compliant' ? 'text-green-600' :
                          retention.complianceStatus === 'warning' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {retention.dueForDeletion} due for deletion
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {retention.deletedRecords} already deleted
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}