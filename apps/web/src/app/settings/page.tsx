'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/settings/user-management';
import { AuditLogsViewer } from '@/components/settings/audit-logs-viewer';
import { SystemConfiguration } from '@/components/settings/system-configuration';
import SystemHealthDashboard from '@/components/settings/system-health-dashboard';
import { 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  Activity,
  User,
  ClipboardList,
  Sliders,
  Monitor
} from 'lucide-react';

type SettingsTab = 'users' | 'audit' | 'system' | 'health';

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
  }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;

      case 'audit':
        return <AuditLogsViewer />;

      case 'system':
        return <SystemConfiguration />;

      case 'health':
        return <SystemHealthDashboard />;

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <SettingsIcon className="h-8 w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure system settings, manage users, and monitor platform health
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-border">
              <nav className="flex space-x-8">
                {SETTINGS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-0 h-auto border-b-2 rounded-none hover:bg-transparent ${
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{tab.name}</span>
                    </Button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {renderTabContent()}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}