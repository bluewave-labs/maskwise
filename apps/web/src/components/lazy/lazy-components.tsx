import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

/**
 * Lazy-loaded components for performance optimization
 * These components are only loaded when needed, reducing initial bundle size
 */

// Monaco Editor - Heavy dependency (~2MB)
export const LazyYAMLEditor = dynamic(
  () => import('@/components/policies/yaml-editor'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded border">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-[13px]">Loading YAML Editor...</span>
        </div>
      </div>
    ),
    ssr: false, // Disable SSR for Monaco
  }
);

// Policy Editor Modal - Depends on Monaco
export const LazyPolicyEditorModal = dynamic(
  () => import('@/components/policies/policy-editor-modal'),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
    ssr: false,
  }
);

// Recharts Components - Heavy charting library
export const LazyProcessingTrendsChart = dynamic(
  () => import('@/components/reports/processing-trends-chart').then(mod => mod.ProcessingTrendsChart),
  {
    loading: () => (
      <div className="h-[350px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export const LazyPIIDistributionChart = dynamic(
  () => import('@/components/reports/pii-distribution-chart').then(mod => mod.PIIDistributionChart),
  {
    loading: () => (
      <div className="h-[350px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export const LazyEntityTypeBreakdown = dynamic(
  () => import('@/components/reports/entity-type-breakdown').then(mod => mod.EntityTypeBreakdown),
  {
    loading: () => (
      <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export const LazyConfidenceDistributionChart = dynamic(
  () => import('@/components/reports/confidence-distribution-chart').then(mod => mod.ConfidenceDistributionChart),
  {
    loading: () => (
      <div className="h-[350px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export const LazyFileTypeAnalysisChart = dynamic(
  () => import('@/components/reports/file-type-analysis-chart').then(mod => mod.FileTypeAnalysisChart),
  {
    loading: () => (
      <div className="h-[350px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export const LazyPolicyEffectivenessChart = dynamic(
  () => import('@/components/reports/policy-effectiveness-chart').then(mod => mod.PolicyEffectivenessChart),
  {
    loading: () => (
      <div className="h-[350px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export const LazyJobPerformanceDashboard = dynamic(
  () => import('@/components/reports/job-performance-dashboard').then(mod => mod.JobPerformanceDashboard),
  {
    loading: () => (
      <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

export const LazyDetectionPerformanceDashboard = dynamic(
  () => import('@/components/reports/detection-performance-dashboard').then(mod => mod.DetectionPerformanceDashboard),
  {
    loading: () => (
      <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

// Report Components
export const LazyOverviewInsights = dynamic(
  () => import('@/components/reports/overview-insights').then(mod => mod.OverviewInsights),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
      </div>
    ),
  }
);

export const LazyPIIDetectionAnalysis = dynamic(
  () => import('@/components/reports/pii-detection-analysis').then(mod => mod.PIIDetectionAnalysis),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
        <Skeleton className="h-[350px]" />
      </div>
    ),
  }
);

export const LazyComplianceRiskTab = dynamic(
  () => import('@/components/reports/compliance-risk-tab').then(mod => mod.ComplianceRiskTab),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    ),
  }
);

// Heavy form components
export const LazyFileUpload = dynamic(
  () => import('@/components/datasets/file-upload').then(mod => mod.FileUpload),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    ),
  }
);

// Settings components
export const LazyApiKeyManagement = dynamic(
  () => import('@/components/settings/api-key-management').then(mod => mod.ApiKeyManagement),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    ),
  }
);

export const LazySystemHealth = dynamic(
  () => import('@/components/settings/system-health-dashboard').then(mod => mod.SystemHealthDashboard),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    ),
  }
);

export const LazyAuditLogsViewer = dynamic(
  () => import('@/components/settings/audit-logs-viewer').then(mod => mod.AuditLogsViewer),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    ),
  }
);