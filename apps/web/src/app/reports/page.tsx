'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-[15px] font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground text-[13px] mt-2">
              View PII detection reports and analytics
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <p className="text-muted-foreground">Reports interface coming soon...</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}