'use client';

import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { usePolicies } from '@/hooks/usePolicies';
import { useAuth } from '@/hooks/useAuth';
import { Policy } from '@/types/policy';
import { Shield, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface PolicySelectorProps {
  selectedPolicyId?: string;
  onPolicySelect: (policyId: string, policy: Policy) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PolicySelector({ 
  selectedPolicyId, 
  onPolicySelect, 
  className = '',
  disabled = false,
  placeholder = 'Select a PII detection policy...'
}: PolicySelectorProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { policies, loading, error, fetchPolicies } = usePolicies();
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Load policies on mount - only after authentication is resolved
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchPolicies({ limit: 100 }); // Load all policies for selection
    }
  }, [fetchPolicies, isAuthenticated, authLoading]);

  // Update selected policy when selectedPolicyId changes
  useEffect(() => {
    if (selectedPolicyId && policies.length > 0) {
      const policy = policies.find(p => p.id === selectedPolicyId);
      if (policy) {
        setSelectedPolicy(policy);
      }
    }
  }, [selectedPolicyId, policies]);

  const handlePolicyChange = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (policy) {
      setSelectedPolicy(policy);
      onPolicySelect(policyId, policy);
    }
  };

  const getPolicyStatus = (policy: Policy): 'active' | 'inactive' | 'draft' => {
    if (!policy.isActive) return 'inactive';
    if (policy._count.versions === 0) return 'draft';
    return 'active';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'inactive':
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      case 'draft':
        return <FileText className="h-3 w-3 text-yellow-600" />;
      default:
        return <Shield className="h-3 w-3 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Don't render until authentication is resolved
  if (authLoading) {
    return (
      <Select disabled>
        <SelectTrigger className="h-[34px]">
          <SelectValue placeholder="Loading...">
            <Spinner className="w-4 h-4 mr-2" />
            <span>Loading...</span>
          </SelectValue>
        </SelectTrigger>
      </Select>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return (
      <Select disabled>
        <SelectTrigger className="h-[34px]">
          <SelectValue placeholder="Authentication required" />
        </SelectTrigger>
      </Select>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="text-[13px] text-red-700">Failed to load policies</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Select 
        value={selectedPolicyId} 
        onValueChange={handlePolicyChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className="h-[34px]">
          <SelectValue placeholder={loading ? 'Loading policies...' : placeholder}>
            {loading && <Spinner className="w-4 h-4 mr-2" />}
            {selectedPolicy && (
              <div className="flex items-center space-x-2">
                <Shield className="h-3 w-3" />
                <span>{selectedPolicy.name}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-[13px] ${getStatusColor(getPolicyStatus(selectedPolicy))}`}
                >
                  {getPolicyStatus(selectedPolicy)}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {policies.filter(policy => policy.isActive).map((policy) => {
            const status = getPolicyStatus(policy);
            return (
              <SelectItem key={policy.id} value={policy.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status)}
                    <div>
                      <div className="font-normal">{policy.name}</div>
                      {policy.description && (
                        <div className="text-[13px] text-gray-500 truncate max-w-xs">
                          {policy.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-[13px] ${getStatusColor(status)}`}
                    >
                      v{policy.version}
                    </Badge>
                    {policy.isDefault && (
                      <Badge variant="secondary" className="text-[13px]">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
              </SelectItem>
            );
          })}
          
          {policies.filter(policy => policy.isActive).length === 0 && !loading && (
            <div className="p-3 text-center text-gray-500">
              <div className="flex flex-col items-center space-y-2">
                <FileText className="h-6 w-6 text-gray-400" />
                <span className="text-[13px]">No active policies found</span>
                <span className="text-[13px]">Create a policy first</span>
              </div>
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Policy Information Display */}
      {selectedPolicy && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[13px]">
          <div className="flex items-start space-x-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-normal text-blue-900">{selectedPolicy.name}</div>
              {selectedPolicy.description && (
                <div className="text-blue-700 mt-1">{selectedPolicy.description}</div>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <Badge 
                  variant="secondary" 
                  className={`text-[13px] ${getStatusColor(getPolicyStatus(selectedPolicy))}`}
                >
                  {getPolicyStatus(selectedPolicy)}
                </Badge>
                <span className="text-[13px] text-blue-600">
                  Version {selectedPolicy.version}
                </span>
                <span className="text-[13px] text-blue-600">
                  {selectedPolicy._count.versions} version{selectedPolicy._count.versions !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}