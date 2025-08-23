'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { usePolicies, usePolicyTemplates } from '@/hooks/usePolicies';
import { Policy, STATUS_COLORS } from '@/types/policy';
import { Search, Plus, FileText, Settings, Calendar, ChevronLeft, ChevronRight, Trash2, Copy } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

function PoliciesContent() {
  const router = useRouter();
  const { policies, total, pages, loading, error, fetchPolicies, deletePolicy } = usePolicies();
  const { templates, fetchTemplates, createFromTemplate } = usePolicyTemplates();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // Show content immediately after component mounts
    setPageLoading(false);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [pageSize, setPageSize] = useState(20);
  const [showTemplates, setShowTemplates] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateForCreation, setSelectedTemplateForCreation] = useState<any>(null);
  const [templatePolicyName, setTemplatePolicyName] = useState('');
  const [totalStats, setTotalStats] = useState({
    totalPolicies: 0,
    activePolicies: 0,
    recentUpdates: 0
  });

  // Fetch total statistics (unfiltered)
  const fetchTotalStats = useCallback(async () => {
    try {
      const totalResponse = await fetchPolicies({ page: 1, limit: 1000 }); // Get all policies for stats
      if (totalResponse) {
        const allPolicies = totalResponse.policies || [];
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        setTotalStats({
          totalPolicies: totalResponse.total || 0,
          activePolicies: allPolicies.filter(p => p.isActive).length,
          recentUpdates: allPolicies.filter(p => new Date(p.updatedAt).getTime() > sevenDaysAgo).length
        });
      }
    } catch (error) {
      console.error('Failed to fetch total stats:', error);
    }
  }, [fetchPolicies]);

  // Fetch policies and templates on mount
  useEffect(() => {
    fetchPolicies({ page: currentPage, limit: pageSize });
    fetchTemplates();
    fetchTotalStats(); // Load unfiltered stats
  }, [fetchPolicies, fetchTemplates, fetchTotalStats, currentPage, pageSize]);

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

  const handleDeletePolicy = (policy: Policy) => {
    setPolicyToDelete(policy);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePolicy = async () => {
    if (!policyToDelete) return;
    
    const success = await deletePolicy(policyToDelete.id);
    if (success) {
      toast({
        title: 'Policy deleted',
        description: `Policy \"${policyToDelete.name}\" has been deleted successfully.`,
      });
      fetchTotalStats();
    }
    setDeleteDialogOpen(false);
    setPolicyToDelete(null);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplateForCreation || !templatePolicyName.trim()) return;
    
    setCreatingFromTemplate(selectedTemplateForCreation.id);
    try {
      const newPolicy = await createFromTemplate(selectedTemplateForCreation.id, templatePolicyName.trim());
      
      if (newPolicy) {
        setShowTemplates(false);
        setTemplateDialogOpen(false);
        await fetchPolicies({ page: currentPage, limit: pageSize });
        fetchTotalStats();
        toast({
          title: 'Policy created',
          description: `Policy \"${templatePolicyName}\" created successfully from template.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create policy from template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingFromTemplate(null);
      setTemplateDialogOpen(false);
      setSelectedTemplateForCreation(null);
      setTemplatePolicyName('');
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

  if (pageLoading) {
    return (
      <div className="p-8 space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-8" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Search and filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-gray-900">Policies</h1>
          <p className="text-gray-600 text-[13px]">Manage PII detection and anonymization policies</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            className="h-[34px]"
            onClick={() => setShowTemplates(true)}
          >
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
              <FileText className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
              <div className="ml-4">
                <p className="text-[13px] font-normal text-gray-600">Total Policies</p>
                <p className="text-xl font-semibold">{totalStats.totalPolicies}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Settings className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
              <div className="ml-4">
                <p className="text-[13px] font-normal text-gray-600">Active Policies</p>
                <p className="text-xl font-semibold">{totalStats.activePolicies}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Copy className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
              <div className="ml-4">
                <p className="text-[13px] font-normal text-gray-600">Templates</p>
                <p className="text-xl font-semibold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" style={{strokeWidth: 1.5}} />
              <div className="ml-4">
                <p className="text-[13px] font-normal text-gray-600">Recent Updates</p>
                <p className="text-xl font-semibold">{totalStats.recentUpdates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search policies by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-[34px]"
          />
        </div>
        
        <div className="flex items-center space-x-4">
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
          {policies.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-[13px] font-normal text-gray-900">No policies found</h3>
              <p className="mt-1 text-[13px] text-gray-500">
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
          ) : (
            <div className="bg-card rounded-lg border">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-normal text-[13px]">
                        Policy
                      </th>
                      <th className="text-left p-4 font-normal text-[13px]">
                        Status
                      </th>
                      <th className="text-left p-4 font-normal text-[13px]">
                        Version
                      </th>
                      <th className="text-left p-4 font-normal text-[13px]">
                        Last Updated
                      </th>
                      <th className="text-left p-4 font-normal text-[13px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((policy) => {
                      const status = getPolicyStatus(policy);
                      return (
                        <tr 
                          key={policy.id} 
                          className="border-b hover:bg-muted/25 transition-colors cursor-pointer"
                          onClick={() => router.push(`/policies/${policy.id}`)}
                        >
                          <td className="p-4">
                            <div>
                              <div className="text-[13px] font-normal text-gray-900">{policy.name}</div>
                              {policy.description && (
                                <div className="text-[13px] text-gray-500 truncate max-w-md">{policy.description}</div>
                              )}
                              {policy.isDefault && (
                                <Badge variant="secondary" className="mt-1 text-xs">Default</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant="secondary" 
                              className={`${STATUS_COLORS[status]} text-xs`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-[13px] text-gray-900">{policy.version}</div>
                            <div className="text-[13px] text-gray-500">{policy._count.versions} version{policy._count.versions !== 1 ? 's' : ''}</div>
                          </td>
                          <td className="p-4 text-[13px] text-gray-500">
                            {formatDate(policy.updatedAt)}
                          </td>
                          <td className="p-4">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePolicy(policy);
                                }}
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

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-[13px] text-muted-foreground">
                    Showing {Math.max(1, (currentPage - 1) * pageSize + 1)}-{Math.min(total, currentPage * pageSize)} of {total} policies
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
                        <option value={10}>10</option>
                        <option value={20}>20</option>
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
                      {currentPage} of {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(pages, currentPage + 1))}
                      disabled={currentPage === pages}
                      className="h-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Templates Modal */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[13px] font-semibold">Policy Templates</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {templates.map((template) => (
              <Card key={template.id} className="border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[13px] mb-2">{template.name}</h3>
                      <p className="text-gray-600 text-[13px] mb-3">{template.description}</p>
                      <div className="flex items-center gap-4 text-[13px] text-gray-500">
                        <span>Category: {template.category}</span>
                        <span>Version: {template.version}</span>
                        <Badge variant="secondary">Template</Badge>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        onClick={() => {
                          setSelectedTemplateForCreation(template);
                          setTemplatePolicyName(`${template.name} - Custom`);
                          setTemplateDialogOpen(true);
                        }}
                        disabled={creatingFromTemplate === template.id}
                        className="h-[34px]"
                      >
                        {creatingFromTemplate === template.id ? (
                          <Spinner className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        {creatingFromTemplate === template.id ? 'Creating...' : 'Use Template'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {templates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <p className="text-[13px]">No policy templates available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Policy Name Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Policy from Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[13px] text-muted-foreground mb-4">
              Creating policy from template: <strong>{selectedTemplateForCreation?.name}</strong>
            </p>
            <div className="space-y-2">
              <label htmlFor="templatePolicyName" className="text-[13px] font-medium">
                Policy Name *
              </label>
              <Input
                id="templatePolicyName"
                value={templatePolicyName}
                onChange={(e) => setTemplatePolicyName(e.target.value)}
                placeholder="Enter policy name"
                className="h-[34px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templatePolicyName.trim()) {
                    handleCreateFromTemplate();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTemplateDialogOpen(false);
                setSelectedTemplateForCreation(null);
                setTemplatePolicyName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFromTemplate}
              disabled={!templatePolicyName.trim() || creatingFromTemplate === selectedTemplateForCreation?.id}
            >
              {creatingFromTemplate === selectedTemplateForCreation?.id ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                'Create Policy'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Policy Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPolicyToDelete(null);
        }}
        onConfirm={confirmDeletePolicy}
        title="Delete Policy"
        description={`Are you sure you want to delete the policy \"${policyToDelete?.name}\"? This action cannot be undone.`}
        confirmText="Delete Policy"
        cancelText="Cancel"
        variant="destructive"
      />
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