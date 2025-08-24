'use client';

import { useState } from 'react';
import { Job } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Search,
  SortAsc,
  SortDesc,
  MoreVertical,
  Play,
  Pause,
  RotateCw,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface JobsListProps {
  jobs: Job[];
  loading?: boolean;
  onViewJob: (job: Job) => void;
  onRetryJob: (job: Job) => void;
  onCancelJob: (job: Job) => void;
  onViewDataset: (job: Job) => void;
}

type SortField = 'createdAt' | 'status' | 'type' | 'duration' | 'dataset';

export function JobsList({
  jobs,
  loading,
  onViewJob,
  onRetryJob,
  onCancelJob,
  onViewDataset
}: JobsListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter and sort jobs
  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = 
        job.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.dataset?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.dataset?.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.createdBy?.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      // Priority sorting: Active jobs (QUEUED, RUNNING) first
      const activeStatuses = ['QUEUED', 'RUNNING'];
      const aIsActive = activeStatuses.includes(a.status);
      const bIsActive = activeStatuses.includes(b.status);
      
      // If one is active and the other isn't, prioritize the active one
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      
      // Both are active or both are inactive, proceed with normal sorting
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'dataset':
          aValue = a.dataset?.name || '';
          bValue = b.dataset?.name || '';
          break;
        case 'duration':
          // Calculate duration
          const aDuration = a.endedAt ? 
            new Date(a.endedAt).getTime() - new Date(a.startedAt || a.createdAt).getTime() : 
            (a.status === 'RUNNING' ? new Date().getTime() - new Date(a.startedAt || a.createdAt).getTime() : 0);
          const bDuration = b.endedAt ? 
            new Date(b.endedAt).getTime() - new Date(b.startedAt || b.createdAt).getTime() : 
            (b.status === 'RUNNING' ? new Date().getTime() - new Date(b.startedAt || b.createdAt).getTime() : 0);
          aValue = aDuration;
          bValue = bDuration;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (job: Job) => {
    if (job.endedAt) {
      const duration = new Date(job.endedAt).getTime() - new Date(job.startedAt || job.createdAt).getTime();
      const seconds = Math.floor(duration / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    } else if (job.status === 'RUNNING' && job.startedAt) {
      const elapsed = new Date().getTime() - new Date(job.startedAt).getTime();
      const seconds = Math.floor(elapsed / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s`;
    }
    return '-';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="h-3 w-3" />;
      case 'RUNNING':
        return <Activity className="h-3 w-3 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3" />;
      case 'CANCELLED':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-normal";
    
    switch (status) {
      case 'QUEUED':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'RUNNING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'COMPLETED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'CANCELLED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatJobType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  const canRetry = (job: Job) => job.status === 'FAILED';
  const canCancel = (job: Job) => job.status === 'QUEUED' || job.status === 'RUNNING';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-[34px] w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-[400px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-normal text-foreground mb-2">No Jobs Yet</h3>
        <p className="text-[13px] text-muted-foreground mb-6">
          Jobs will appear here when you upload datasets for PII detection and processing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-[34px]"
          />
        </div>
      </div>

      {/* Results Info */}
      {filteredJobs.length !== jobs.length && (
        <div className="text-[13px] text-muted-foreground">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </div>
      )}

      {/* Jobs Table */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-muted-foreground">No jobs match your search.</p>
          <Button
            variant="outline"
            onClick={() => setSearchTerm('')}
            className="mt-4 h-[34px]"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-2">
                      Job Type
                      {getSortIcon('type')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('dataset')}
                  >
                    <div className="flex items-center gap-2">
                      Dataset
                      {getSortIcon('dataset')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">Progress</th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('duration')}
                  >
                    <div className="flex items-center gap-2">
                      Duration
                      {getSortIcon('duration')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedJobs.map((job) => (
                  <tr 
                    key={job.id} 
                    className="border-b hover:bg-muted/25 transition-colors cursor-pointer"
                    onClick={() => onViewJob(job)}
                  >
                    <td className="p-4">
                      <div className="font-normal text-[13px]">{formatJobType(job.type)}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-normal text-[13px]">{job.dataset?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-muted-foreground">{job.dataset?.filename}</div>
                    </td>
                    <td className="p-4">
                      <span className={getStatusBadge(job.status)}>
                        {getStatusIcon(job.status)}
                        {job.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground min-w-[2.5rem]">
                          {job.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatDuration(job)}
                    </td>
                    <td className="p-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => onViewJob(job)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {job.dataset && (
                              <DropdownMenuItem onClick={() => onViewDataset(job)}>
                                <FileText className="h-4 w-4 mr-2" />
                                View Dataset
                              </DropdownMenuItem>
                            )}
                            {canRetry(job) && (
                              <DropdownMenuItem onClick={() => onRetryJob(job)}>
                                <RotateCw className="h-4 w-4 mr-2" />
                                Retry Job
                              </DropdownMenuItem>
                            )}
                            {canCancel(job) && (
                              <DropdownMenuItem 
                                onClick={() => onCancelJob(job)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Cancel Job
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-[13px] text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length} jobs
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-[13px] text-muted-foreground">Rows per page:</span>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-[13px] border rounded px-2 py-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[13px] px-3">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}