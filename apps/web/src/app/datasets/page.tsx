'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoleGate } from '@/components/auth/role-gate';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DatasetList } from '@/components/datasets/dataset-list';
import { AddDatasetModal } from '@/components/datasets/add-dataset-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api as apiClient } from '@/lib/api';
import { Plus, Database, TrendingUp, FileText, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Counter from '@/components/ui/counter';

interface DatasetStats {
  totalDatasets: number;
  processingDatasets: number;
  completedDatasets: number;
  totalFindings: number;
}

export default function DatasetsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DatasetStats>({
    totalDatasets: 0,
    processingDatasets: 0,
    completedDatasets: 0,
    totalFindings: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Get basic dataset statistics
      const response = await apiClient.get('/datasets', {
        params: { limit: 1000 } // Get all to calculate stats
      });

      if (response.data) {
        const datasets = response.data.data || [];
        const totalDatasets = datasets.length;
        const processingDatasets = datasets.filter((d: any) => d.status === 'PROCESSING' || d.status === 'PENDING').length;
        const completedDatasets = datasets.filter((d: any) => d.status === 'COMPLETED').length;
        const totalFindings = datasets.reduce((sum: number, d: any) => sum + (d._count?.findings || 0), 0);

        setStats({
          totalDatasets,
          processingDatasets,
          completedDatasets,
          totalFindings,
        });
      }
    } catch (error) {
      console.error('Error fetching dataset stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDataset = () => {
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleUploadComplete = () => {
    // Refresh the dataset list and stats
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle="Datasets"
        pageDescription="Manage your uploaded files and view PII analysis results"
      >
        <div className="max-w-7xl">
          {loading ? (
            <div className="space-y-6">
              {/* Stats cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-24 mb-2" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dataset list skeleton */}
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Skeleton className="h-4 w-4" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-9" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <div className="p-4">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <div className="ml-4">
                        <p className="text-[13px] font-normal text-gray-600">Total Datasets</p>
                        <Counter 
                          value={stats.totalDatasets} 
                          className="text-xl font-semibold"
                          delay={0}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <div className="ml-4">
                        <p className="text-[13px] font-normal text-gray-600">Processing</p>
                        <Counter 
                          value={stats.processingDatasets} 
                          className="text-xl font-semibold"
                          delay={0.05}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <div className="ml-4">
                        <p className="text-[13px] font-normal text-gray-600">Completed</p>
                        <Counter 
                          value={stats.completedDatasets} 
                          className="text-xl font-semibold"
                          delay={0.1}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                      <div className="ml-4">
                        <p className="text-[13px] font-normal text-gray-600">PII Findings</p>
                        <Counter 
                          value={stats.totalFindings} 
                          className="text-xl font-semibold"
                          delay={0.15}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Header with Add Dataset Button - Admin Only */}
              <RoleGate adminOnly>
                <div className="flex items-center justify-end mb-6">
                  <Button onClick={handleAddDataset}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Dataset
                  </Button>
                </div>
              </RoleGate>

              {/* Dataset List */}
              <DatasetList refreshTrigger={refreshTrigger} />

              {/* Add Dataset Modal */}
              <AddDatasetModal
                isOpen={isAddModalOpen}
                onClose={handleModalClose}
                onUploadComplete={handleUploadComplete}
              />
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}