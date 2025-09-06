'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { 
  TrendingUp, 
  Database, 
  Shield, 
  Users, 
  Activity, 
  Upload, 
  FolderPlus, 
  FileText, 
  Eye, 
  Search,
  ArrowRight 
} from 'lucide-react';

interface DashboardStats {
  recentScans: number;
  totalDatasets: number;
  totalFindings: number;
  activeProjects: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    recentScans: 0,
    totalDatasets: 0,
    totalFindings: 0,
    activeProjects: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/dashboard/stats');
      
      // Ensure we have proper defaults for any missing fields
      const statsData = response.data || {};
      setStats({
        recentScans: statsData.recentScans ?? 0,
        totalDatasets: statsData.totalDatasets ?? 0,
        totalFindings: statsData.totalFindings ?? statsData.piiFindings ?? 0,
        activeProjects: statsData.activeProjects ?? 0
      });
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard statistics');
      // Keep the default zero values in case of error
      setStats({
        recentScans: 0,
        totalDatasets: 0,
        totalFindings: 0,
        activeProjects: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: {
    title: string;
    value: number;
    icon: any;
    color: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <Icon className={`h-5 w-5 ${color}`} />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                (value ?? 0).toLocaleString()
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QuickActionButton = ({ title, description, icon: Icon, onClick, color }: {
    title: string;
    description: string;
    icon: any;
    onClick: () => void;
    color: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-start">
          <Icon className={`h-6 w-6 ${color} mt-1`} />
          <div className="ml-4 flex-1">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle="Dashboard"
        pageDescription="Monitor your PII detection activities and system overview"
      >
        <div className="max-w-7xl">
          {/* Header with Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Welcome back, {user?.firstName}
                </h1>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => router.push('/datasets')} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Dataset
                </Button>
                <Button onClick={() => router.push('/search')} className="bg-blue-600 hover:bg-blue-700">
                  <Search className="h-4 w-4 mr-2" />
                  Search PII
                </Button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">Error loading dashboard data</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={fetchDashboardStats}
                className="mt-2 text-sm text-red-600 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Recent Scans"
              value={stats.recentScans}
              icon={TrendingUp}
              color="text-green-600"
            />
            <StatCard
              title="Total Datasets"
              value={stats.totalDatasets}
              icon={Database}
              color="text-blue-600"
            />
            <StatCard
              title="PII Findings"
              value={stats.totalFindings}
              icon={Shield}
              color="text-orange-600"
            />
            <StatCard
              title="Active Projects"
              value={stats.activeProjects}
              icon={FolderPlus}
              color="text-purple-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickActionButton
                title="Upload Dataset"
                description="Upload files for PII detection and analysis"
                icon={Upload}
                color="text-blue-600"
                onClick={() => router.push('/datasets')}
              />
              <QuickActionButton
                title="Search PII"
                description="Search across all your PII findings"
                icon={Search}
                color="text-green-600"
                onClick={() => router.push('/search')}
              />
              <QuickActionButton
                title="View Projects"
                description="Manage your data processing projects"
                icon={FolderPlus}
                color="text-purple-600"
                onClick={() => router.push('/projects')}
              />
              <QuickActionButton
                title="Manage Policies"
                description="Configure PII detection policies"
                icon={Shield}
                color="text-orange-600"
                onClick={() => router.push('/policies')}
              />
              <QuickActionButton
                title="View Jobs"
                description="Monitor processing job status"
                icon={Activity}
                color="text-indigo-600"
                onClick={() => router.push('/jobs')}
              />
              <QuickActionButton
                title="View Reports"
                description="Generate compliance reports"
                icon={FileText}
                color="text-pink-600"
                onClick={() => router.push('/reports')}
              />
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}