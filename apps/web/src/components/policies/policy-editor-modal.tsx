"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { YAMLEditor } from './yaml-editor';
import { usePolicies } from '@/hooks/usePolicies';
import { YAMLValidationResult, Policy } from '@/types/policy';
import { useToast } from '@/hooks/use-toast';
import { Save, FileText, X } from 'lucide-react';

interface PolicyEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: Policy | null;
  onSave?: () => void;
}

const defaultPolicyYAML = `name: "Custom Policy"
version: "1.0.0"  
description: "Custom PII detection and anonymization policy"

# Entity Detection Configuration
detection:
  entities:
    - type: "EMAIL_ADDRESS"
      confidence_threshold: 0.9
      action: "redact"
    - type: "SSN"
      confidence_threshold: 0.85
      action: "mask"
    - type: "CREDIT_CARD"
      confidence_threshold: 0.95
      action: "replace"
      replacement: "[CREDIT-CARD-REDACTED]"
    - type: "PHONE_NUMBER"
      confidence_threshold: 0.8
      action: "mask"
    - type: "PERSON"
      confidence_threshold: 0.75
      action: "redact"

# File Processing Scope
scope:
  file_types:
    - "txt"
    - "csv"
    - "pdf"
    - "docx"
    - "xlsx"
  max_file_size: "100MB"

# Anonymization Settings  
anonymization:
  default_action: "redact"
  preserve_format: true
  audit_trail: true
`;

export function PolicyEditorModal({
  open,
  onOpenChange,
  policy,
  onSave
}: PolicyEditorModalProps) {
  const [yamlContent, setYamlContent] = useState(defaultPolicyYAML);
  const [validationResult, setValidationResult] = useState<YAMLValidationResult>({ isValid: true });
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  
  const { createPolicy, updatePolicy } = usePolicies();
  const { toast } = useToast();
  
  const isEditing = !!policy;
  
  // Initialize form when policy changes or modal opens
  useEffect(() => {
    if (open) {
      if (policy) {
        // Editing existing policy
        setName(policy.name);
        setYamlContent(policy.yamlContent);
      } else {
        // Creating new policy
        setName('');
        setYamlContent(defaultPolicyYAML);
      }
      setValidationResult({ isValid: true });
    }
  }, [open, policy]);

  const handleYAMLChange = (yaml: string, isValid: boolean) => {
    setYamlContent(yaml);
  };

  const handleValidationChange = (isValid: boolean, result: YAMLValidationResult) => {
    setValidationResult(result);
  };

  const handleSave = async () => {
    if (!validationResult.isValid) {
      toast({
        title: 'Invalid YAML',
        description: 'Please fix the validation errors before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && policy) {
        // Update existing policy
        await updatePolicy(policy.id, {
          name: name || policy.name,
          yamlContent,
        });
        toast({
          title: 'Policy Updated',
          description: `Policy "${name || policy.name}" has been updated successfully.`,
        });
      } else {
        // Create new policy
        await createPolicy({
          name: name || 'Untitled Policy',
          yamlContent,
        });
        toast({
          title: 'Policy Created',
          description: `Policy "${name || 'Untitled Policy'}" has been created successfully.`,
        });
      }
      
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save the policy. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5" />
              <DialogTitle className="text-[15px] font-bold">
                {isEditing ? 'Edit Policy' : 'Create New Policy'}
              </DialogTitle>
              {validationResult.isValid ? (
                <Badge variant="success">Valid YAML</Badge>
              ) : (
                <Badge variant="destructive">
                  {validationResult.errors?.length || 0} Error(s)
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Policy Name Input */}
          <Card className="flex-shrink-0">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label htmlFor="policy-name" className="text-[13px] font-medium">
                  Policy Name
                </Label>
                <Input
                  id="policy-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter policy name..."
                  className="h-9 text-[13px]"
                />
                <p className="text-xs text-muted-foreground">
                  This name will be used to identify the policy in the system.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* YAML Editor - Takes remaining space */}
          <div className="flex-1 overflow-hidden">
            <YAMLEditor
              initialYaml={yamlContent}
              onSave={handleSave}
              onValidChange={handleValidationChange}
              readonly={false}
              className="h-full"
            />
          </div>

          {/* Action Buttons */}
          <Card className="flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>
                    {isEditing ? 'Editing' : 'Creating'} policy:{' '}
                    <span className="font-medium">{name || 'Untitled Policy'}</span>
                  </span>
                  {validationResult.isValid && (
                    <Badge variant="success" className="text-xs">Ready to Save</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={handleClose} className="h-[34px]">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!validationResult.isValid || isSaving}
                    className="h-[34px]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : (isEditing ? 'Update Policy' : 'Create Policy')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PolicyEditorModal;