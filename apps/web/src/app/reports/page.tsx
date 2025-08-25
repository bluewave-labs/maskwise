'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SimpleAnimatedTabs } from '@/components/ui/simple-animated-tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionErrorBoundary } from '@/components/error/error-boundary';
// Use lazy loaded components for heavy charts
import { 
  LazyOverviewInsights as OverviewInsights,
  LazyPIIDetectionAnalysis as PIIDetectionAnalysis,
  LazyComplianceRiskTab as ComplianceRiskTab
} from '@/components/lazy/lazy-components';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <SectionErrorBoundary>
            <OverviewInsights />
          </SectionErrorBoundary>
        );
      case 'detection':
        return (
          <SectionErrorBoundary>
            <PIIDetectionAnalysis />
          </SectionErrorBoundary>
        );
      case 'compliance':
        return (
          <SectionErrorBoundary>
            <ComplianceRiskTab />
          </SectionErrorBoundary>
        );
      default:
        return (
          <SectionErrorBoundary>
            <OverviewInsights />
          </SectionErrorBoundary>
        );
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle="Reports & Analytics"
        pageDescription="Generate comprehensive reports and analyze PII detection trends"
      >
        <div className="space-y-6">
          <SimpleAnimatedTabs 
            tabs={[
              { label: 'Overview & Insights', value: 'overview' },
              { label: 'PII Detection & Analysis', value: 'detection' },
              { label: 'Compliance & Risk', value: 'compliance' }
            ]}
            defaultTab="overview"
            className="mb-6"
            onTabChange={setActiveTab}
          />
          
          {renderTabContent()}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}