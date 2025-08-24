'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { 
  ClipboardList,
  Search,
  Download,
  Calendar,
  User,
  Activity,
  Filter,
  RefreshCw,
  FileText,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AuditLogsViewerProps {
  className?: string;
}

interface FilterOptions {
  search: string;
  action: string;
  dateFrom: string;
  dateTo: string;
  userId: string;
}

type SortField = 'createdAt' | 'action' | 'user' | 'resource';

const AUDIT_ACTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'VIEW', label: 'View' },
  { value: 'UPLOAD', label: 'Upload' },
  { value: 'DOWNLOAD', label: 'Download' }
];

export function AuditLogsViewer({ className }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    action: 'ALL',
    dateFrom: '',
    dateTo: '',
    userId: ''
  });

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchAuditLogs = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.action && filters.action !== 'ALL' && { action: filters.action }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.userId && { userId: filters.userId })
      });

      const response = await api.get(`/users/audit-logs/all?${params}`);
      setLogs(response.data.logs || []);
      setTotalLogs(response.data.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      if (error.response?.status !== 401) {
        toast({
          title: 'Error',
          description: 'Failed to load audit logs',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchAuditLogs();
    }
  }, [isAuthenticated, authLoading, currentPage, pageSize, filters]);

  // Sort logs locally (since API doesn't support sorting)
  const sortedLogs = [...logs].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'action':
        aValue = a.action.toLowerCase();
        bValue = b.action.toLowerCase();
        break;
      case 'user':
        aValue = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
        bValue = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();
        break;
      case 'resource':
        aValue = a.resource.toLowerCase();
        bValue = b.resource.toLowerCase();
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

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      action: 'ALL',
      dateFrom: '',
      dateTo: '',
      userId: ''
    });
    setCurrentPage(1);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      
      // Get all logs (without pagination) for export
      const params = new URLSearchParams({
        limit: '10000', // Large limit to get all logs
        ...(filters.search && { search: filters.search }),
        ...(filters.action && filters.action !== 'ALL' && { action: filters.action }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.userId && { userId: filters.userId })
      });

      const response = await api.get(`/users/audit-logs/all?${params}`);
      const exportLogs = response.data.logs || [];

      if (format === 'csv') {
        exportToCSV(exportLogs);
      } else {
        exportToJSON(exportLogs);
      }

      toast({
        title: 'Export successful',
        description: `${exportLogs.length} audit logs exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export audit logs',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = (exportLogs: AuditLog[]) => {
    const headers = ['Date', 'User', 'Action', 'Resource', 'Details', 'IP Address'];
    const csvContent = [
      headers.join(','),
      ...exportLogs.map(log => [
        new Date(log.createdAt).toISOString(),
        `"${log.user.firstName} ${log.user.lastName} (${log.user.email})"`,
        log.action,
        log.resource,
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
        log.ipAddress || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = (exportLogs: AuditLog[]) => {
    const jsonContent = JSON.stringify(exportLogs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800 hover:bg-green-200/50 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800/50';
      case 'logout':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200/50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/50';
      case 'create':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200/50 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800/50';
      case 'update':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200/50 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800/50';
      case 'delete':
        return 'bg-red-100 text-red-800 hover:bg-red-200/50 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800/50';
      case 'upload':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200/50 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800/50';
      case 'download':
        return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200/50 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800/50';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200/50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/50';
    }
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  if (authLoading || loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold">Audit Logs</h3>
            <p className="text-muted-foreground text-[13px]">
              Loading audit logs and system activity...
            </p>
          </div>
        </div>
        
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground">Loading audit logs...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Authentication required</p>
        </div>
      </Card>
    );
  }

  if (showLogDetails && selectedLog) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowLogDetails(false);
              setSelectedLog(null);
            }}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Audit Logs
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold">Audit Log Details</h3>
            <p className="text-muted-foreground text-[13px]">
              Detailed view of audit log entry
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-[13px] font-normal">Action</Label>
                <div className="mt-1">
                  <Badge className={getActionBadgeColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-[13px] font-normal">Timestamp</Label>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <div>
                <Label className="text-[13px] font-normal">User</Label>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})
                </p>
              </div>
              <div>
                <Label className="text-[13px] font-normal">Resource</Label>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {selectedLog.resource} {selectedLog.resourceId && `(ID: ${selectedLog.resourceId})`}
                </p>
              </div>
              <div>
                <Label className="text-[13px] font-normal">IP Address</Label>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {selectedLog.ipAddress || 'N/A'}
                </p>
              </div>
            </div>

            {/* Details Section */}
            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <div>
                <Label className="text-[13px] font-normal">Details</Label>
                <Card className="mt-2 p-4 bg-muted/50">
                  <pre className="text-[13px] text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </Card>
              </div>
            )}

            {/* User Agent */}
            {selectedLog.userAgent && (
              <div>
                <Label className="text-[13px] font-normal">User Agent</Label>
                <p className="text-[13px] text-muted-foreground mt-1 break-all">
                  {selectedLog.userAgent}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_ACTIONS.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              placeholder="From Date"
            />
          </div>

          <div className="min-w-[140px]">
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              placeholder="To Date"
            />
          </div>

          <Button variant="outline" size="sm" onClick={resetFilters}>
            Clear
          </Button>
        </div>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-muted-foreground">
            {totalLogs} total logs • Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalLogs)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={exporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[140px]">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileText className="h-4 w-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Audit Logs Table */}
      {sortedLogs.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-normal text-foreground mb-2">No Audit Logs Found</h3>
          <p className="text-[13px] text-muted-foreground mb-6">
            No audit logs match your current filters.
          </p>
          <Button onClick={resetFilters} variant="outline">
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
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Timestamp
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('user')}
                  >
                    <div className="flex items-center gap-2">
                      User
                      {getSortIcon('user')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('action')}
                  >
                    <div className="flex items-center gap-2">
                      Action
                      {getSortIcon('action')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('resource')}
                  >
                    <div className="flex items-center gap-2">
                      Resource
                      {getSortIcon('resource')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">IP Address</th>
                  <th className="text-left p-4 font-normal text-[13px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="border-b hover:bg-muted/25 transition-colors"
                  >
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="text-[13px] font-normal">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {log.resource}
                      {log.resourceId && ` (ID: ${log.resourceId})`}
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[140px]">
                          <DropdownMenuItem onClick={() => {
                            setSelectedLog(log);
                            setShowLogDetails(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
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
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} logs
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-[13px] text-muted-foreground">Rows per page:</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-[13px] border rounded px-2 py-1"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
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