'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YAMLEditor } from '@/components/policies/yaml-editor';
import { usePolicies, usePolicyTemplates } from '@/hooks/usePolicies';
import { YAMLValidationResult } from '@/types/policy';
import { ArrowLeft, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function CreatePolicyContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { createPolicy } = usePolicies();
  const { templates, fetchTemplates } = usePolicyTemplates();

  const [isCreating, setIsCreating] = useState(false);
  const [validationResult, setValidationResult] = useState<YAMLValidationResult>({ isValid: false });
  const [yamlContent, setYamlContent] = useState('');
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Load templates on mount
  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleValidationChange = (isValid: boolean, result: YAMLValidationResult) => {
    setValidationResult(result);
  };

  const handleYamlSave = (yaml: string) => {
    setYamlContent(yaml);
  };

  const handleCreatePolicy = async () => {
    if (!validationResult.isValid || !yamlContent) {
      toast({
        variant: 'destructive',
        title: 'Invalid Policy',
        description: 'Please fix the YAML validation errors before creating the policy.',
      });
      return;
    }

    if (!policyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Policy Name',
        description: 'Please enter a name for your policy.',
      });
      return;
    }

    setIsCreating(true);

    try {
      const newPolicy = await createPolicy({
        name: policyName,
        description: policyDescription || `Policy created from YAML configuration`,
        yamlContent,
        tags: selectedTemplate ? [selectedTemplate.toLowerCase()] : [],
        isActive: true,
      });

      if (newPolicy) {
        toast({
          title: 'Policy Created',
          description: `Policy "${newPolicy.name}" has been created successfully.`,
        });
        router.push('/policies');
      } else {
        throw new Error('Failed to create policy');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Failed to create the policy. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId && templateId !== 'blank') {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        // Convert template config to YAML format
        const templateYaml = `name: "${template.name} - Custom"
version: "1.0.0"
description: "${template.description} (customized)"
detection:
  entities:${template.config.entities.map((entity: string) => `
    - type: "${entity}"
      confidence_threshold: ${template.config.confidence_threshold || 0.9}
      action: "${template.config.anonymization?.default_anonymizer || 'redact'}"`).join('')}
scope:
  file_types: ["txt", "csv", "pdf", "docx"]
  max_file_size: "100MB"
anonymization:
  default_action: "${template.config.anonymization?.default_anonymizer || 'redact'}"
  preserve_format: true
  audit_trail: true`;

        setYamlContent(templateYaml);
        setPolicyName(`${template.name} - Custom`);
        setPolicyDescription(`${template.description} (customized)`);
      }
    } else if (templateId === 'blank') {
      const blankYaml = `name: "My Custom Policy"
version: "1.0.0"
description: "Custom PII detection policy"
detection:
  entities:
    - type: "EMAIL_ADDRESS"
      confidence_threshold: 0.9
      action: "redact"
    - type: "SSN"
      confidence_threshold: 0.95
      action: "mask"
scope:
  file_types: ["txt", "csv", "pdf"]
  max_file_size: "100MB"
anonymization:
  default_action: "redact"
  preserve_format: true
  audit_trail: true`;
      setYamlContent(blankYaml);
      setPolicyName('');
      setPolicyDescription('');
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Create Policy</h1>
            <p className="text-gray-600">Create a new PII detection and anonymization policy</p>
          </div>
        </div>
        <Button
          onClick={handleCreatePolicy}
          disabled={!validationResult.isValid || !policyName.trim() || isCreating}
          className="h-[34px]"
        >
          {isCreating ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Creating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Create Policy
            </>
          )}
        </Button>
      </div>

      {/* Policy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Policy Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="policyName">Policy Name *</Label>
              <Input
                id="policyName"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder="Enter policy name"
                className="h-[34px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Start from Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="h-[34px]">
                  <SelectValue placeholder="Choose a template or start blank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Blank Policy
                    </div>
                  </SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyDescription">Description (optional)</Label>
            <Input
              id="policyDescription"
              value={policyDescription}
              onChange={(e) => setPolicyDescription(e.target.value)}
              placeholder="Enter policy description"
              className="h-[34px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* YAML Editor */}
      <YAMLEditor
        initialYaml={yamlContent}
        onSave={handleYamlSave}
        onValidChange={handleValidationChange}
        key={selectedTemplate} // Force re-render when template changes
      />
    </div>
  );
}

export default function CreatePolicyPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <CreatePolicyContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}