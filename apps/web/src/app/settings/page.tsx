'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoleGate } from '@/components/auth/role-gate';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/types/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SimpleAnimatedTabs } from '@/components/ui/simple-animated-tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/settings/user-management';
import { AuditLogsViewer } from '@/components/settings/audit-logs-viewer';
import { SystemConfiguration } from '@/components/settings/system-configuration';
import SystemHealthDashboard from '@/components/settings/system-health-dashboard';
import { ApiKeyManagement } from '@/components/settings/api-key-management';
import { 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  Activity,
  User,
  ClipboardList,
  Sliders,
  Monitor,
  Key
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type SettingsTab = 'users' | 'audit' | 'system' | 'health' | 'api-keys';

interface TabConfig {
  id: SettingsTab;
  name: string;
  description: string;
  icon: React.ElementType;
}

const SETTINGS_TABS: TabConfig[] = [
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage admin users, roles, and permissions',
    icon: Users
  },
  {
    id: 'audit',
    name: 'Audit Logs',
    description: 'View system activity logs and compliance reports',
    icon: ClipboardList
  },
  {
    id: 'system',
    name: 'System Configuration',
    description: 'Configure file limits, PII detection settings',
    icon: Sliders
  },
  {
    id: 'health',
    name: 'System Health',
    description: 'Monitor service status and resource usage',
    icon: Monitor
  },
  {
    id: 'api-keys',
    name: 'API Keys',
    description: 'Generate and manage API keys for programmatic access',
    icon: Key
  }
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL parameters for tab selection
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && ['users', 'audit', 'system', 'health', 'api-keys'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    // Show content immediately after component mounts
    setLoading(false);
  }, [searchParams]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <RoleGate adminOnly fallback={<div className="text-center py-12"><p className="text-muted-foreground">Only administrators can manage users.</p></div>}>
            <UserManagement />
          </RoleGate>
        );

      case 'audit':
        return <AuditLogsViewer />;

      case 'system':
        return (
          <RoleGate adminOnly fallback={<div className="text-center py-12"><p className="text-muted-foreground">Only administrators can manage system configuration.</p></div>}>
            <SystemConfiguration />
          </RoleGate>
        );

      case 'health':
        return <SystemHealthDashboard />;

      case 'api-keys':
        return (
          <RoleGate adminOnly fallback={<div className="text-center py-12"><p className="text-muted-foreground">Only administrators can manage API keys.</p></div>}>
            <ApiKeyManagement />
          </RoleGate>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle="Settings"
        pageDescription="Configure your Maskwise instance and manage system preferences"
      >
        <div className="max-w-6xl">
          {loading ? (
            <div className="space-y-6">

              {/* Tab navigation skeleton */}
              <div className="mb-8">
                <div className="border-b border-border">
                  <nav className="flex space-x-8">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center space-x-2 pb-4 px-1">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Content skeleton */}
              <div className="space-y-6">
                <div className="mb-6">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-72" />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-32" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8" />
                        <div>
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-6 w-8" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border bg-card">
                  <div className="p-6">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>

          {/* Tab Navigation */}
          <div className="mb-8">
            <SimpleAnimatedTabs 
              tabs={SETTINGS_TABS.map(tab => ({ label: tab.name, value: tab.id }))}
              defaultTab={activeTab}
              onTabChange={(value) => {
                setActiveTab(value as SettingsTab);
                router.push(`/settings?tab=${value}`);
              }}
              className="w-full"
            />
          </div>

              {/* Tab Content */}
              <div className="min-h-[500px]">
                {renderTabContent()}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}