'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/spinner';
import { 
  Upload, 
  FileText, 
  Shield, 
  Sliders, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  Settings as SettingsIcon,
  HardDrive,
  Clock
} from 'lucide-react';
import api from '@/lib/api';

interface SystemConfiguration {
  file: {
    maxSize: number; // in MB
    allowedTypes: string[];
    retentionDays: number;
  };
  pii: {
    defaultConfidenceThreshold: number;
    defaultAction: 'redact' | 'mask' | 'replace' | 'encrypt';
    enabledEntityTypes: string[];
  };
  security: {
    enableFileContentScanning: boolean;
    maxConcurrentJobs: number;
    jobTimeoutMinutes: number;
  };
  performance: {
    workerConcurrency: number;
    maxQueueSize: number;
    enableCaching: boolean;
  };
}

const DEFAULT_CONFIG: SystemConfiguration = {
  file: {
    maxSize: 100,
    allowedTypes: ['txt', 'csv', 'pdf', 'docx', 'xlsx', 'json', 'jsonl'],
    retentionDays: 30
  },
  pii: {
    defaultConfidenceThreshold: 0.85,
    defaultAction: 'redact',
    enabledEntityTypes: ['EMAIL_ADDRESS', 'SSN', 'CREDIT_CARD', 'PHONE_NUMBER', 'PERSON']
  },
  security: {
    enableFileContentScanning: true,
    maxConcurrentJobs: 10,
    jobTimeoutMinutes: 30
  },
  performance: {
    workerConcurrency: 5,
    maxQueueSize: 1000,
    enableCaching: true
  }
};

const FILE_TYPES = [
  { value: 'txt', label: 'Text (.txt)' },
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'jsonl', label: 'JSON Lines (.jsonl)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pptx', label: 'PowerPoint (.pptx)' },
  { value: 'png', label: 'PNG Images (.png)' },
  { value: 'jpg', label: 'JPEG Images (.jpg)' },
  { value: 'tiff', label: 'TIFF Images (.tiff)' }
];

const PII_ENTITY_TYPES = [
  { value: 'EMAIL_ADDRESS', label: 'Email Addresses' },
  { value: 'SSN', label: 'Social Security Numbers' },
  { value: 'CREDIT_CARD', label: 'Credit Card Numbers' },
  { value: 'PHONE_NUMBER', label: 'Phone Numbers' },
  { value: 'PERSON', label: 'Person Names' },
  { value: 'LOCATION', label: 'Locations' },
  { value: 'ORGANIZATION', label: 'Organizations' },
  { value: 'DATE_TIME', label: 'Dates & Times' },
  { value: 'IP_ADDRESS', label: 'IP Addresses' },
  { value: 'URL', label: 'URLs' },
  { value: 'US_DRIVER_LICENSE', label: 'Driver Licenses' },
  { value: 'US_PASSPORT', label: 'US Passports' },
  { value: 'MEDICAL_LICENSE', label: 'Medical Licenses' },
  { value: 'IBAN', label: 'IBAN Numbers' },
  { value: 'UK_NHS', label: 'UK NHS Numbers' }
];

const ANONYMIZATION_ACTIONS = [
  { value: 'redact', label: 'Redact (Remove completely)' },
  { value: 'mask', label: 'Mask (Replace with ****)' },
  { value: 'replace', label: 'Replace (Custom text)' },
  { value: 'encrypt', label: 'Encrypt (Reversible)' }
];

interface SystemConfigurationProps {
  className?: string;
}

export function SystemConfiguration({ className }: SystemConfigurationProps) {
  const [config, setConfig] = useState<SystemConfiguration>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SystemConfiguration>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadConfiguration();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    const configChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(configChanged);
  }, [config, originalConfig]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await api.get('/system/configuration');
      const loadedConfig = response.data || DEFAULT_CONFIG;
      setConfig(loadedConfig);
      setOriginalConfig(loadedConfig);
    } catch (error: any) {
      console.error('Failed to load system configuration:', error);
      if (error.response?.status !== 404) {
        toast({
          title: 'Error',
          description: 'Failed to load system configuration. Using defaults.',
          variant: 'destructive',
        });
      }
      // Use default config if loading fails
      setConfig(DEFAULT_CONFIG);
      setOriginalConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      await api.put('/system/configuration', config);
      setOriginalConfig({ ...config });
      toast({
        title: 'Configuration Saved',
        description: 'System configuration has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Failed to save system configuration:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save system configuration.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetConfiguration = () => {
    setConfig({ ...originalConfig });
  };

  const updateFileConfig = (key: keyof SystemConfiguration['file'], value: any) => {
    setConfig(prev => ({
      ...prev,
      file: { ...prev.file, [key]: value }
    }));
  };

  const updatePiiConfig = (key: keyof SystemConfiguration['pii'], value: any) => {
    setConfig(prev => ({
      ...prev,
      pii: { ...prev.pii, [key]: value }
    }));
  };

  const updateSecurityConfig = (key: keyof SystemConfiguration['security'], value: any) => {
    setConfig(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }));
  };

  const updatePerformanceConfig = (key: keyof SystemConfiguration['performance'], value: any) => {
    setConfig(prev => ({
      ...prev,
      performance: { ...prev.performance, [key]: value }
    }));
  };

  const toggleFileType = (fileType: string) => {
    const currentTypes = config.file.allowedTypes;
    const newTypes = currentTypes.includes(fileType)
      ? currentTypes.filter(type => type !== fileType)
      : [...currentTypes, fileType];
    updateFileConfig('allowedTypes', newTypes);
  };

  const toggleEntityType = (entityType: string) => {
    const currentTypes = config.pii.enabledEntityTypes;
    const newTypes = currentTypes.includes(entityType)
      ? currentTypes.filter(type => type !== entityType)
      : [...currentTypes, entityType];
    updatePiiConfig('enabledEntityTypes', newTypes);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" className="mr-2" />
        <span className="text-muted-foreground">Loading system configuration...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold">System Configuration</h3>
            <p className="text-muted-foreground text-sm">
              Configure file upload limits, PII detection settings, and system behavior
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Unsaved Changes
            </Badge>
          )}
          <Button 
            variant="outline" 
            onClick={resetConfiguration}
            disabled={!hasChanges || saving}
            className="h-[34px]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={saveConfiguration}
            disabled={!hasChanges || saving}
            className="h-[34px]"
          >
            {saving ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* File Upload Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            File Upload Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                min="1"
                max="1000"
                value={config.file.maxSize}
                onChange={(e) => updateFileConfig('maxSize', parseInt(e.target.value) || 1)}
                className="h-[36px]"
              />
              <p className="text-xs text-muted-foreground">
                Current limit: {config.file.maxSize}MB per file
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="retentionDays">File Retention (Days)</Label>
              <Input
                id="retentionDays"
                type="number"
                min="1"
                max="365"
                value={config.file.retentionDays}
                onChange={(e) => updateFileConfig('retentionDays', parseInt(e.target.value) || 1)}
                className="h-[36px]"
              />
              <p className="text-xs text-muted-foreground">
                Files will be deleted after {config.file.retentionDays} days
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Allowed File Types</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {FILE_TYPES.map((fileType) => {
                const isEnabled = config.file.allowedTypes.includes(fileType.value);
                return (
                  <Button
                    key={fileType.value}
                    variant={isEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFileType(fileType.value)}
                    className="h-[34px] justify-start"
                  >
                    {isEnabled && <CheckCircle className="w-3 h-3 mr-2" />}
                    {fileType.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {config.file.allowedTypes.length} file types enabled
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PII Detection Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            PII Detection Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="confidenceThreshold">Default Confidence Threshold</Label>
              <Input
                id="confidenceThreshold"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={config.pii.defaultConfidenceThreshold}
                onChange={(e) => updatePiiConfig('defaultConfidenceThreshold', parseFloat(e.target.value) || 0)}
                className="h-[36px]"
              />
              <p className="text-xs text-muted-foreground">
                Minimum confidence score: {(config.pii.defaultConfidenceThreshold * 100).toFixed(0)}%
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultAction">Default Anonymization Action</Label>
              <Select 
                value={config.pii.defaultAction} 
                onValueChange={(value: any) => updatePiiConfig('defaultAction', value)}
              >
                <SelectTrigger className="h-[36px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANONYMIZATION_ACTIONS.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Enabled PII Entity Types</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {PII_ENTITY_TYPES.map((entityType) => {
                const isEnabled = config.pii.enabledEntityTypes.includes(entityType.value);
                return (
                  <Button
                    key={entityType.value}
                    variant={isEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleEntityType(entityType.value)}
                    className="h-[34px] justify-start"
                  >
                    {isEnabled && <CheckCircle className="w-3 h-3 mr-2" />}
                    {entityType.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {config.pii.enabledEntityTypes.length} entity types enabled for detection
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security & Performance Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxConcurrentJobs">Max Concurrent Jobs</Label>
              <Input
                id="maxConcurrentJobs"
                type="number"
                min="1"
                max="50"
                value={config.security.maxConcurrentJobs}
                onChange={(e) => updateSecurityConfig('maxConcurrentJobs', parseInt(e.target.value) || 1)}
                className="h-[36px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTimeout">Job Timeout (Minutes)</Label>
              <Input
                id="jobTimeout"
                type="number"
                min="5"
                max="120"
                value={config.security.jobTimeoutMinutes}
                onChange={(e) => updateSecurityConfig('jobTimeoutMinutes', parseInt(e.target.value) || 5)}
                className="h-[36px]"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="contentScanning"
                type="checkbox"
                checked={config.security.enableFileContentScanning}
                onChange={(e) => updateSecurityConfig('enableFileContentScanning', e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="contentScanning">Enable file content scanning</Label>
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-purple-600" />
              Performance Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workerConcurrency">Worker Concurrency</Label>
              <Input
                id="workerConcurrency"
                type="number"
                min="1"
                max="20"
                value={config.performance.workerConcurrency}
                onChange={(e) => updatePerformanceConfig('workerConcurrency', parseInt(e.target.value) || 1)}
                className="h-[36px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxQueueSize">Max Queue Size</Label>
              <Input
                id="maxQueueSize"
                type="number"
                min="100"
                max="10000"
                step="100"
                value={config.performance.maxQueueSize}
                onChange={(e) => updatePerformanceConfig('maxQueueSize', parseInt(e.target.value) || 100)}
                className="h-[36px]"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="enableCaching"
                type="checkbox"
                checked={config.performance.enableCaching}
                onChange={(e) => updatePerformanceConfig('enableCaching', e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="enableCaching">Enable result caching</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Max File Size</p>
              <p className="font-medium">{config.file.maxSize}MB</p>
            </div>
            <div>
              <p className="text-muted-foreground">File Types</p>
              <p className="font-medium">{config.file.allowedTypes.length} enabled</p>
            </div>
            <div>
              <p className="text-muted-foreground">PII Confidence</p>
              <p className="font-medium">{(config.pii.defaultConfidenceThreshold * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">PII Entities</p>
              <p className="font-medium">{config.pii.enabledEntityTypes.length} types</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning about changes */}
      {hasChanges && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved configuration changes. These changes will affect all future file uploads and PII analysis operations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}