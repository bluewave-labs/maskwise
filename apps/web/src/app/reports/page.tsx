'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SimpleAnimatedTabs } from '@/components/ui/simple-animated-tabs';
import { OverviewInsights } from '@/components/reports/overview-insights';
import { PIIDetectionAnalysis } from '@/components/reports/pii-detection-analysis';
import { ComplianceRiskTab } from '@/components/reports/compliance-risk-tab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewInsights />;
      case 'detection':
        return <PIIDetectionAnalysis />;
      case 'compliance':
        return <ComplianceRiskTab />;
      default:
        return <OverviewInsights />;
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