'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { Spinner } from '@/components/ui/spinner';
import { MetricCard, MetricCardContent } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { TrendingUp, Database, Shield, Users, Activity, Upload, FolderPlus, FileText, Eye, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, isLoading, error, refetch } = useDashboardStats();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-8">
          <div className="mb-8">
            <h1>Welcome to Maskwise Dashboard</h1>
          </div>

          {error && (
            <div className="bg-destructive/15 border border-destructive/50 p-4 rounded-lg mb-8">
              <p className="text-destructive font-medium">Failed to load dashboard statistics</p>
              <p className="text-destructive/80 text-sm mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 text-sm text-destructive underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard variant="blue">
              <MetricCardContent>
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Recent Scans</p>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Spinner size="sm" className="mr-2" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-medium text-gray-700">{stats?.recentScans ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Last 7 days</p>
                      </>
                    )}
                  </div>
                </div>
              </MetricCardContent>
            </MetricCard>
            
            <MetricCard variant="green">
              <MetricCardContent>
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Datasets</p>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Spinner size="sm" className="mr-2" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-medium text-gray-700">{stats?.totalDatasets ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Total processed</p>
                      </>
                    )}
                  </div>
                </div>
              </MetricCardContent>
            </MetricCard>
            
            <MetricCard variant="red">
              <MetricCardContent>
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-red-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">PII Findings</p>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Spinner size="sm" className="mr-2" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-medium text-gray-700">{stats?.piiFindings ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Entities detected</p>
                      </>
                    )}
                  </div>
                </div>
              </MetricCardContent>
            </MetricCard>
            
            <MetricCard variant="purple">
              <MetricCardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Projects</p>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Spinner size="sm" className="mr-2" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-medium text-gray-700">{stats?.activeProjects ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Active projects</p>
                      </>
                    )}
                  </div>
                </div>
              </MetricCardContent>
            </MetricCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="flex items-center gap-2 col-span-2"
                    onClick={() => window.location.href = '/anonymize'}
                  >
                    <Sparkles className="h-4 w-4" />
                    Start Anonymization Workflow
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/datasets'}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Dataset
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/projects'}
                  >
                    <FolderPlus className="h-4 w-4" />
                    Create Project
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/policies'}
                  >
                    <FileText className="h-4 w-4" />
                    View Policies
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/settings?tab=audit'}
                  >
                    <Eye className="h-4 w-4" />
                    Audit Logs
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ActivityFeed />
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}