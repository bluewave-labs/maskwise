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
  ChevronRight
} from 'lucide-react';

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
      second: '2-digit',
    });
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'logout':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'create':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'update':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'upload':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'download':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
            <p className="text-muted-foreground text-sm">
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
            <p className="text-muted-foreground text-sm">
              Detailed view of audit log entry
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium">Action</Label>
                <div className="mt-1">
                  <Badge className={getActionBadgeColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Timestamp</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">User</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Resource</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLog.resource} {selectedLog.resourceId && `(ID: ${selectedLog.resourceId})`}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">IP Address</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLog.ipAddress || 'N/A'}
                </p>
              </div>
            </div>

            {/* Details Section */}
            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <div>
                <Label className="text-sm font-medium">Details</Label>
                <Card className="mt-2 p-4 bg-muted/50">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </Card>
              </div>
            )}

            {/* User Agent */}
            {selectedLog.userAgent && (
              <div>
                <Label className="text-sm font-medium">User Agent</Label>
                <p className="text-sm text-muted-foreground mt-1 break-all">
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
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="h-6 w-6 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold">Audit Logs</h3>
          <p className="text-muted-foreground text-sm">
            Browse system activities and export compliance reports
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <h4 className="font-medium">Filters</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
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

            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {totalLogs} total logs • Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalLogs)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={exporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <div className="p-6">
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No audit logs found matching your filters
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                        <span className="text-sm font-medium">
                          {log.user.firstName} {log.user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.resource} {log.resourceId && `(${log.resourceId})`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(log.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user.email}
                        </span>
                        {log.ipAddress && (
                          <span>IP: {log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLog(log);
                        setShowLogDetails(true);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Page size:</Label>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}