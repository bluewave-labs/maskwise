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
import { Skeleton } from '@/components/ui/skeleton';

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
              <p className="text-destructive font-normal">Failed to load dashboard statistics</p>
              <p className="text-destructive/80 text-[13px] mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 text-[13px] text-destructive underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">Recent Scans</p>
                    {isLoading ? (
                      <>
                        <Skeleton className="h-6 w-12 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold">{stats?.recentScans ?? 0}</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Database className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">Datasets</p>
                    {isLoading ? (
                      <>
                        <Skeleton className="h-6 w-12 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold">{stats?.totalDatasets ?? 0}</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">PII Findings</p>
                    {isLoading ? (
                      <>
                        <Skeleton className="h-6 w-12 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold">{stats?.piiFindings ?? 0}</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                  <div className="ml-4">
                    <p className="text-[13px] font-normal text-gray-600">Projects</p>
                    {isLoading ? (
                      <>
                        <Skeleton className="h-6 w-12 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold">{stats?.activeProjects ?? 0}</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Quick Actions</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Anonymization Workflow - Full Width */}
                  <div 
                    className="col-span-2 p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/50 border border-blue-200 hover:border-blue-400 rounded-lg cursor-pointer transition-all group"
                    onClick={() => window.location.href = '/anonymize'}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <h3 className="font-semibold text-[13px] text-gray-900">Start Anonymization</h3>
                      <p className="text-[13px] text-gray-600">Begin guided workflow</p>
                    </div>
                  </div>

                  {/* Upload Dataset */}
                  <div 
                    className="p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 border border-gray-200 hover:border-gray-400 rounded-lg cursor-pointer transition-all group"
                    onClick={() => window.location.href = '/datasets'}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Upload className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <h3 className="font-semibold text-[13px] text-gray-900">Upload Dataset</h3>
                      <p className="text-[13px] text-gray-600">Add new files</p>
                    </div>
                  </div>

                  {/* Create Project */}
                  <div 
                    className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-200/50 border border-green-200 hover:border-green-400 rounded-lg cursor-pointer transition-all group"
                    onClick={() => window.location.href = '/projects'}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <FolderPlus className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <h3 className="font-semibold text-[13px] text-gray-900">Create Project</h3>
                      <p className="text-[13px] text-gray-600">Organize datasets</p>
                    </div>
                  </div>

                  {/* View Policies */}
                  <div 
                    className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-200/50 border border-purple-200 hover:border-purple-400 rounded-lg cursor-pointer transition-all group"
                    onClick={() => window.location.href = '/policies'}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <FileText className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <h3 className="font-semibold text-[13px] text-gray-900">View Policies</h3>
                      <p className="text-[13px] text-gray-600">Manage rules</p>
                    </div>
                  </div>

                  {/* Audit Logs */}
                  <div 
                    className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 hover:from-orange-100 hover:to-orange-200/50 border border-orange-200 hover:border-orange-400 rounded-lg cursor-pointer transition-all group"
                    onClick={() => window.location.href = '/settings?tab=audit'}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Eye className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <h3 className="font-semibold text-[13px] text-gray-900">Audit Logs</h3>
                      <p className="text-[13px] text-gray-600">View activity</p>
                    </div>
                  </div>
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