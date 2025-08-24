'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SimpleAnimatedTabs } from '@/components/ui/simple-animated-tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle="Reports & Analytics"
        pageDescription="Generate comprehensive reports and analyze PII detection trends"
      >
        <div className="space-y-6">
          <SimpleAnimatedTabs 
            tabs={[
              { label: 'Overview', value: 'overview' },
              { label: 'PII Detection', value: 'detection' },
              { label: 'Compliance', value: 'compliance' },
              { label: 'Risk Analysis', value: 'risk' },
              { label: 'Export', value: 'export' }
            ]}
            defaultTab="overview"
            className="mb-6"
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Reports Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Animated tabs are now working! Click the tabs above to see the smooth animations.
              </p>
              <p className="text-muted-foreground mt-4">
                This is a demonstration of the new animated tabs component that has replaced the standard shadcn tabs throughout the dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}