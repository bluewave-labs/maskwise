'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePolicies, usePolicyTemplates } from '@/hooks/usePolicies';
import { Policy, STATUS_COLORS } from '@/types/policy';
import { Search, Plus, FileText, Settings, Calendar, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Copy } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

function PoliciesContent() {
  const router = useRouter();
  const { policies, total, pages, loading, error, fetchPolicies, deletePolicy } = usePolicies();
  const { templates, fetchTemplates } = usePolicyTemplates();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [pageSize, setPageSize] = useState(20);

  // Fetch policies and templates on mount
  useEffect(() => {
    fetchPolicies({ page: currentPage, limit: pageSize });
    fetchTemplates();
  }, [fetchPolicies, fetchTemplates, currentPage, pageSize]);

  // Filter policies when search or status changes
  useEffect(() => {
    const filters = {
      page: 1, // Reset to first page on filter change
      limit: pageSize,
      ...(searchTerm && { search: searchTerm }),
      ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' }),
    };
    
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    
    fetchPolicies(filters);
  }, [searchTerm, statusFilter, pageSize, fetchPolicies]);

  const handleDeletePolicy = async (policy: Policy) => {
    if (window.confirm(`Are you sure you want to delete the policy \"${policy.name}\"?`)) {
      const success = await deletePolicy(policy.id);
      if (success) {
        toast({
          title: 'Policy deleted',
          description: `Policy \"${policy.name}\" has been deleted successfully.`,
        });
      }
    }
  };

  const getPolicyStatus = (policy: Policy): 'active' | 'inactive' | 'draft' => {
    if (!policy.isActive) return 'inactive';
    if (policy._count.versions === 0) return 'draft';
    return 'active';
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

  const paginationRange = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(pages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }
    
    rangeWithDots.push(...range);
    
    if (currentPage + delta < pages - 1) {
      rangeWithDots.push('...', pages);
    } else {
      rangeWithDots.push(pages);
    }
    
    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index && item !== currentPage);
  }, [currentPage, pages]);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          <p className="text-gray-600">Manage PII detection and anonymization policies</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="h-[34px]">
            <FileText className="w-4 h-4 mr-2" />
            Templates ({templates.length})
          </Button>
          <Button 
            onClick={() => router.push('/policies/create')}
            className="h-[34px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Policies</p>
                <p className="text-xl font-semibold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Policies</p>
                <p className="text-xl font-semibold">{policies.filter(p => p.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Copy className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-xl font-semibold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Updates</p>
                <p className="text-xl font-semibold">{policies.filter(p => new Date(p.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Policy Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search policies by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-[34px]"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
              <SelectTrigger className="w-48 h-[34px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-32 h-[34px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6 mr-2" />
              <span className="text-gray-600">Loading policies...</span>
            </div>
          )}

          {/* Policies Table */}
          {!loading && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Policy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {policies.map((policy) => {
                      const status = getPolicyStatus(policy);
                      return (
                        <tr key={policy.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                              {policy.description && (
                                <div className="text-sm text-gray-500 truncate max-w-md">{policy.description}</div>
                              )}
                              {policy.isDefault && (
                                <Badge variant="secondary" className="mt-1 text-xs">Default</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant="secondary" 
                              className={`${STATUS_COLORS[status]} text-xs`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{policy.version}</div>
                            <div className="text-xs text-gray-500">{policy._count.versions} version{policy._count.versions !== 1 ? 's' : ''}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(policy.updatedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => router.push(`/policies/${policy.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => router.push(`/policies/${policy.id}?edit=true`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleDeletePolicy(policy)}
                                disabled={policy.isDefault}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {policies.length === 0 && !loading && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No policies found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Get started by creating your first policy.'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <div className="mt-6">
                      <Button onClick={() => router.push('/policies/create')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Policy
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between pt-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="h-[34px]"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(Math.min(pages, currentPage + 1))}
                      disabled={currentPage === pages}
                      variant="outline"
                      className="h-[34px]"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{Math.max(1, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                        <span className="font-medium">{Math.min(total, currentPage * pageSize)}</span> of{' '}
                        <span className="font-medium">{total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          variant="outline"
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border h-[34px] text-sm font-medium"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        {paginationRange.map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              onClick={() => setCurrentPage(page as number)}
                              variant={currentPage === page ? "default" : "outline"}
                              className="relative inline-flex items-center px-4 py-2 border text-sm font-medium h-[34px]"
                            >
                              {page}
                            </Button>
                          )
                        ))}
                        
                        <Button
                          onClick={() => setCurrentPage(Math.min(pages, currentPage + 1))}
                          disabled={currentPage === pages}
                          variant="outline"
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border h-[34px] text-sm font-medium"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PoliciesContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}