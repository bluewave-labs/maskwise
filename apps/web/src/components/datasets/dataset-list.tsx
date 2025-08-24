'use client';

import { useState, useEffect } from 'react';
import { api as apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ErrorDetailsModal } from '@/components/datasets/error-details-modal';
import { formatFileSize, formatRelativeTime } from '@/lib/utils';
import { useBackgroundRefreshWithMount } from '@/hooks/useBackgroundRefresh';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Eye, 
  Download,
  FileText,
  Image,
  File,
  Loader2,
  AlertCircle,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  RotateCcw,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface Dataset {
  id: string;
  name: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'UPLOADED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  project: {
    id: string;
    name: string;
  };
  jobs: Array<{
    id: string;
    type: string;
    status: string;
  }>;
  _count?: {
    findings: number;
  };
}

interface DatasetListProps {
  refreshTrigger?: number;
}

type SortField = 'name' | 'createdAt' | 'fileSize' | 'status' | 'findings';

const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case 'txt':
    case 'csv':
    case 'json':
      return <FileText className="h-4 w-4" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'tiff':
    case 'bmp':
    case 'gif':
      return <Image className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string) => {
  const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-normal";
  
  switch (status) {
    case 'UPLOADED':
      return `${baseClasses} bg-slate-100 text-slate-700`;
    case 'COMPLETED':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'PROCESSING':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'PENDING':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'FAILED':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'CANCELLED':
      return `${baseClasses} bg-gray-100 text-gray-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

interface DatasetResponse {
  data: Dataset[];
  total: number;
}

export function DatasetList({ refreshTrigger = 0 }: DatasetListProps) {
  const { user } = useAuth();
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [errorDatasetId, setErrorDatasetId] = useState<string | null>(null);

  // Background refresh for datasets
  const {
    data: datasetResponse,
    isLoading: loading,
    error,
    isRefreshing,
    refresh: refreshDatasets
  } = useBackgroundRefreshWithMount<DatasetResponse>({
    fetchFn: async () => {
      const response = await apiClient.get('/datasets', {
        params: {
          limit: 1000, // Get all for client-side filtering/sorting
        },
      });

      if (response.data) {
        return {
          data: response.data.data || [],
          total: response.data.total || 0
        };
      } else {
        throw new Error('Failed to fetch datasets');
      }
    },
    shouldPoll: (data) => {
      // Poll when there are processing datasets
      return data?.data?.some(d => 
        d.status === 'PENDING' || d.status === 'PROCESSING'
      ) ?? false;
    },
    activeInterval: 5000, // 5 seconds for processing datasets
    inactiveInterval: 30000, // 30 seconds when idle
  });

  // Extract datasets from response
  const datasets = datasetResponse?.data || [];
  const totalCount = datasetResponse?.total || 0;

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshDatasets();
    }
  }, [refreshTrigger, refreshDatasets]);

  // Filter and sort datasets
  const filteredDatasets = datasets
    .filter(dataset => {
      const matchesSearch = dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           dataset.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           dataset.project.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || dataset.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'findings':
          aValue = a._count?.findings || 0;
          bValue = b._count?.findings || 0;
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
  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = filteredDatasets.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  // Helper function to detect if dataset has errors
  const hasErrors = (dataset: Dataset) => {
    // Dataset explicitly failed
    if (dataset.status === 'FAILED') {
      return true;
    }
    
    // Any jobs failed
    if (dataset.jobs && dataset.jobs.some(job => job.status === 'FAILED')) {
      return true;
    }
    
    // Dataset cancelled but no jobs completed successfully
    if (dataset.status === 'CANCELLED') {
      const hasSuccessfulJobs = dataset.jobs && dataset.jobs.some(job => job.status === 'COMPLETED');
      // Only show as error if cancelled AND no jobs succeeded
      return !hasSuccessfulJobs;
    }
    
    return false;
  };

  const handleViewErrorDetails = (datasetId: string) => {
    setErrorDatasetId(datasetId);
    setShowErrorDetails(true);
  };

  const handleErrorModalClose = () => {
    setShowErrorDetails(false);
    setErrorDatasetId(null);
  };

  const handleRetryComplete = () => {
    refreshDatasets(); // Refresh the list after retry
  };

  const handleRefresh = () => {
    refreshDatasets();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortField('createdAt');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const handleDeleteClick = (dataset: Dataset) => {
    setDatasetToDelete(dataset);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!datasetToDelete) return;
    
    try {
      setIsDeleting(true);
      await apiClient.delete(`/datasets/${datasetToDelete.id}`);
      refreshDatasets(); // Refresh the list
      setShowDeleteConfirm(false);
      setDatasetToDelete(null);
    } catch (err: any) {
      console.error('Error deleting dataset:', err);
      // Keep the dialog open and show error through the normal error state
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDatasetToDelete(null);
    setIsDeleting(false);
  };

  const handleDownload = async (dataset: Dataset) => {
    try {
      toast({
        title: 'Download Starting',
        description: `Preparing ${dataset.filename}...`,
      });

      const response = await apiClient.get(`/datasets/${dataset.id}/download`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use dataset filename
      const contentDisposition = response.headers['content-disposition'];
      let filename = dataset.filename;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: `${filename} has been downloaded successfully.`,
      });
    } catch (err: any) {
      console.error('Download error:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err.response?.data?.message || 'Failed to download file. Please try again.',
      });
    }
  };

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

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-normal text-foreground mb-2">Failed to Load Datasets</h3>
        <p className="text-[13px] text-muted-foreground mb-6">{error}</p>
        <Button onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-normal text-foreground mb-2">No Datasets Yet</h3>
        <p className="text-[13px] text-muted-foreground mb-6">
          Upload your first dataset to start detecting PII in your files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search datasets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-[34px]"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-[34px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="UPLOADED">Uploaded</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleReset} className="h-[34px]">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Results Info */}
      {filteredDatasets.length !== datasets.length && (
        <div className="text-[13px] text-muted-foreground">
          Showing {filteredDatasets.length} of {datasets.length} datasets
        </div>
      )}

      {/* Datasets Table */}
      {filteredDatasets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-muted-foreground">No datasets match your search.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="mt-4 h-[34px]"
          >
            Clear Filters
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
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Dataset Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">Project</th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('fileSize')}
                  >
                    <div className="flex items-center gap-2">
                      Size
                      {getSortIcon('fileSize')}
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
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('findings')}
                  >
                    <div className="flex items-center gap-2">
                      PII Findings
                      {getSortIcon('findings')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Uploaded
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDatasets.map((dataset) => (
                  <tr 
                    key={dataset.id} 
                    className="border-b hover:bg-muted/25 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground">
                          {getFileIcon(dataset.fileType)}
                        </div>
                        <div>
                          <div className="font-normal text-[13px]">{dataset.name}</div>
                          <div className="text-xs text-muted-foreground">{dataset.filename}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {dataset.project.name}
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatFileSize(dataset.fileSize)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={getStatusBadge(dataset.status)}>
                          {dataset.status === 'PROCESSING' && (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          )}
                          {dataset.status === 'FAILED' && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {dataset.status}
                        </span>
                        {hasErrors(dataset) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewErrorDetails(dataset.id)}
                            className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            View Error
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {dataset._count?.findings || 0}
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatRelativeTime(dataset.createdAt)}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          {dataset.status === 'COMPLETED' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/datasets/${dataset.id}/findings`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Results
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDownload(dataset)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Original File
                          </DropdownMenuItem>
                          {isAdmin(user) && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(dataset)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                Showing {startIndex + 1}-{Math.min(endIndex, filteredDatasets.length)} of {filteredDatasets.length} datasets
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Dataset"
        description={`Are you sure you want to delete "${datasetToDelete?.name}"? This action cannot be undone and will permanently remove the dataset and all associated PII findings.`}
        confirmText="Delete Dataset"
        cancelText="Cancel"
        variant="destructive"
        loading={isDeleting}
      />

      {/* Error Details Modal */}
      {errorDatasetId && (
        <ErrorDetailsModal
          datasetId={errorDatasetId}
          isOpen={showErrorDetails}
          onClose={handleErrorModalClose}
          onRetry={handleRetryComplete}
        />
      )}
    </div>
  );
}