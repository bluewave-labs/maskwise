'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { YAMLEditor } from '@/components/policies/yaml-editor';
import { usePolicies } from '@/hooks/usePolicies';
import { Policy, YAMLValidationResult } from '@/types/policy';
import { ArrowLeft, Edit, Eye, Save, History, MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

function PolicyDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getPolicy, updatePolicy, deletePolicy } = usePolicies();

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<YAMLValidationResult>({ isValid: true });
  const [yamlContent, setYamlContent] = useState('');

  const policyId = params?.id as string;

  useEffect(() => {
    if (policyId) {
      loadPolicy();
    }
  }, [policyId]);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const policyData = await getPolicy(policyId);
      if (policyData) {
        setPolicy(policyData);
        // Convert policy config to YAML (simplified conversion)
        const yamlFromConfig = convertConfigToYAML(policyData);
        setYamlContent(yamlFromConfig);
      } else {
        toast({
          variant: 'destructive',
          title: 'Policy Not Found',
          description: 'The requested policy could not be found.',
        });
        router.push('/policies');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Load Error',
        description: 'Failed to load policy details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const convertConfigToYAML = (policy: Policy): string => {
    // This is a simplified conversion - in a real app, you'd want more sophisticated logic
    try {
      const config = policy.config as any;
      
      // If it's already in the newer YAML-like format
      if (config.name || config.version) {
        return `name: "${policy.name}"
version: "${policy.version}"
description: "${policy.description || 'Policy configuration'}"
detection:
  entities:${config.detection?.entities?.map((entity: any) => `
    - type: "${entity.type}"
      confidence_threshold: ${entity.confidence_threshold}
      action: "${entity.action}"${entity.replacement ? `
      replacement: "${entity.replacement}"` : ''}`).join('') || config.entities?.map((entityType: string) => `
    - type: "${entityType}"
      confidence_threshold: ${config.confidence_threshold || 0.9}
      action: "${config.anonymization?.default_anonymizer || 'redact'}"`).join('') || ''}
scope:
  file_types: ["txt", "csv", "pdf", "docx"]
  max_file_size: "100MB"
anonymization:
  default_action: "${config.anonymization?.default_action || config.anonymization?.default_anonymizer || 'redact'}"
  preserve_format: ${config.anonymization?.preserve_format || true}
  audit_trail: ${config.anonymization?.audit_trail || true}`;
      }

      // Convert legacy template format
      return `name: "${policy.name}"
version: "${policy.version}"
description: "${policy.description || 'Policy configuration'}"
detection:
  entities:${config.entities?.map((entityType: string) => `
    - type: "${entityType}"
      confidence_threshold: ${config.confidence_threshold || 0.9}
      action: "${config.anonymization?.default_anonymizer || 'redact'}"`).join('') || ''}
scope:
  file_types: ["txt", "csv", "pdf", "docx"]
  max_file_size: "100MB"
anonymization:
  default_action: "${config.anonymization?.default_anonymizer || 'redact'}"
  preserve_format: true
  audit_trail: true`;

    } catch (error) {
      return `name: "${policy.name}"
version: "${policy.version}"
description: "${policy.description || 'Policy configuration'}"
detection:
  entities:
    - type: "EMAIL_ADDRESS"
      confidence_threshold: 0.9
      action: "redact"
scope:
  file_types: ["txt", "csv", "pdf"]
  max_file_size: "100MB"
anonymization:
  default_action: "redact"
  preserve_format: true
  audit_trail: true`;
    }
  };

  const handleValidationChange = (isValid: boolean, result: YAMLValidationResult) => {
    setValidationResult(result);
  };

  const handleSavePolicy = async (yaml: string) => {
    if (!policy || !validationResult.isValid) return;

    setIsSaving(true);
    try {
      const updatedPolicy = await updatePolicy(policy.id, {
        yamlContent: yaml,
        isActive: policy.isActive,
      });

      if (updatedPolicy) {
        setPolicy(updatedPolicy);
        setIsEditing(false);
        toast({
          title: 'Policy Updated',
          description: 'Your policy has been updated successfully.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update the policy. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async () => {
    if (!policy) return;

    if (window.confirm(`Are you sure you want to delete the policy "${policy.name}"?`)) {
      const success = await deletePolicy(policy.id);
      if (success) {
        toast({
          title: 'Policy Deleted',
          description: `Policy "${policy.name}" has been deleted successfully.`,
        });
        router.push('/policies');
      }
    }
  };

  const getPolicyStatus = () => {
    if (!policy) return 'unknown';
    if (!policy.isActive) return 'inactive';
    if (policy._count.versions === 0) return 'draft';
    return 'active';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-6 h-6 mr-2" />
          <span className="text-gray-600">Loading policy...</span>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Policy not found</p>
          <Button onClick={() => router.push('/policies')}>Back to Policies</Button>
        </div>
      </div>
    );
  }

  const status = getPolicyStatus();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-[34px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{policy.name}</h1>
              <Badge 
                variant="secondary" 
                className={`text-xs ${
                  status === 'active' ? 'bg-green-100 text-green-800' :
                  status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              {policy.isDefault && (
                <Badge variant="secondary" className="text-xs">Default</Badge>
              )}
            </div>
            <p className="text-gray-600">{policy.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-[34px]"
                disabled={policy.isDefault}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDeletePolicy}
                className="h-[34px] text-red-600 hover:text-red-700"
                disabled={policy.isDefault}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setYamlContent(convertConfigToYAML(policy));
                }}
                className="h-[34px]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSavePolicy(yamlContent)}
                disabled={!validationResult.isValid || isSaving}
                className="h-[34px]"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Policy Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Policy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-600">Version</div>
              <div className="text-lg">{policy.version}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Versions</div>
              <div className="text-lg">{policy._count.versions}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Last Updated</div>
              <div className="text-lg">{formatDate(policy.updatedAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      {policy.versions && policy.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <History className="w-5 h-5 mr-2" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {policy.versions.slice(0, 5).map((version) => (
                <div key={version.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="text-xs">
                      v{version.version}
                    </Badge>
                    {version.isActive && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        Active
                      </Badge>
                    )}
                    <span className="text-sm text-gray-600">
                      {formatDate(version.createdAt)}
                    </span>
                  </div>
                  {version.changelog && (
                    <span className="text-sm text-gray-500">{version.changelog}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* YAML Editor */}
      <YAMLEditor
        initialYaml={yamlContent}
        onSave={handleSavePolicy}
        onValidChange={handleValidationChange}
        readonly={!isEditing}
      />
    </div>
  );
}

export default function PolicyDetailsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PolicyDetailsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}