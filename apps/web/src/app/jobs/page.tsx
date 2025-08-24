'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { JobsList } from '@/components/jobs/jobs-list';
import { JobDetailsModal } from '@/components/jobs/job-details-modal';
import { useJobs, Job } from '@/hooks/useJobs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Counter from '@/components/ui/counter';
import { toast } from '@/hooks/use-toast';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function JobsPage() {
  const router = useRouter();
  const { jobs, stats, loading, error, refetch, retryJob, cancelJob } = useJobs();
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Show content immediately after component mounts
    setPageLoading(false);
  }, []);

  // Auto-refresh for active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === 'QUEUED' || j.status === 'RUNNING');
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        refetch();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [jobs, refetch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Refreshed',
        description: 'Jobs list has been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Failed to refresh jobs list. Please try again.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setDetailsModalOpen(true);
  };

  const handleRetryJob = async (job: Job) => {
    try {
      const result = await retryJob(job.id);
      if (result.success) {
        toast({
          title: 'Job Retried',
          description: `Job has been queued for retry.`,
        });
        setDetailsModalOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Retry Failed',
          description: result.error || 'Failed to retry job. Please try again.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Retry Failed',
        description: 'Failed to retry job. Please try again.',
      });
    }
  };

  const handleCancelJob = async (job: Job) => {
    try {
      const result = await cancelJob(job.id);
      if (result.success) {
        toast({
          title: 'Job Cancelled',
          description: `Job has been cancelled.`,
        });
        setDetailsModalOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Cancel Failed',
          description: result.error || 'Failed to cancel job. Please try again.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Cancel Failed',
        description: 'Failed to cancel job. Please try again.',
      });
    }
  };

  const handleViewDataset = (job: Job) => {
    if (job.dataset) {
      // Navigate to the dedicated dataset details page
      router.push(`/datasets/${job.dataset.id}`);
    }
  };


  // Stats cards data with fallback values
  const statsCards = [
    {
      title: 'Total Jobs',
      value: typeof stats.total === 'number' ? stats.total : 0,
      icon: Activity,
    },
    {
      title: 'Queued',
      value: typeof stats.queued === 'number' ? stats.queued : 0,
      icon: Clock,
    },
    {
      title: 'Running',
      value: typeof stats.running === 'number' ? stats.running : 0,
      icon: Activity,
    },
    {
      title: 'Completed',
      value: typeof stats.completed === 'number' ? stats.completed : 0,
      icon: CheckCircle,
    },
    {
      title: 'Failed',
      value: typeof stats.failed === 'number' ? stats.failed : 0,
      icon: XCircle,
    },
    {
      title: 'Cancelled',
      value: typeof stats.cancelled === 'number' ? stats.cancelled : 0,
      icon: AlertTriangle,
    },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle="Jobs"
        pageDescription="Monitor and manage your PII detection and processing jobs"
      >
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {statsCards.map((card) => (
              <Card key={card.title}>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <card.icon className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
                    <div className="ml-4">
                      <p className="text-[13px] font-normal text-gray-600">{card.title}</p>
                      {pageLoading ? (
                        <>
                          <Skeleton className="h-6 w-12 mb-1" />
                        </>
                      ) : (
                        <>
                          <Counter 
                            value={card.value} 
                            className="text-xl font-semibold"
                            delay={0}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Job History</h2>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-[34px]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Content */}
          {pageLoading ? (
            <div className="space-y-6">
              {/* Search skeleton */}
              <div className="flex gap-4">
                <Skeleton className="h-9 flex-1 max-w-md" />
                <Skeleton className="h-9 w-32" />
              </div>
              
              {/* Table skeleton */}
              <div className="bg-card rounded-lg border">
                <div className="p-4 border-b">
                  <div className="grid grid-cols-7 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Skeleton key={i} className="h-4" />
                    ))}
                  </div>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 border-b last:border-b-0">
                    <div className="grid grid-cols-7 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <Skeleton key={j} className="h-4" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <JobsList
              jobs={jobs}
              loading={loading}
              onViewJob={handleViewJob}
              onRetryJob={handleRetryJob}
              onCancelJob={handleCancelJob}
              onViewDataset={handleViewDataset}
            />
          )}

          {/* Job Details Modal */}
          <JobDetailsModal
            job={selectedJob}
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
            onRetryJob={handleRetryJob}
            onCancelJob={handleCancelJob}
            onViewDataset={handleViewDataset}
          />
        </>
      </DashboardLayout>
    </ProtectedRoute>
  );
}