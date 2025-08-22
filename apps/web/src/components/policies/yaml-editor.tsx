'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePolicies } from '@/hooks/usePolicies';
import { YAMLValidationResult } from '@/types/policy';
import { CheckCircle, AlertTriangle, AlertCircle, Save, Eye, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { debounce } from '@/lib/utils';

interface YAMLEditorProps {
  initialYaml?: string;
  onSave?: (yaml: string) => void;
  onValidChange?: (isValid: boolean, result: YAMLValidationResult) => void;
  readonly?: boolean;
  className?: string;
}

const SAMPLE_YAML = `name: "My Custom Policy"
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
    - type: "CREDIT_CARD"
      confidence_threshold: 0.95
      action: "replace"
      replacement: "[CREDIT_CARD]"
scope:
  file_types: ["txt", "csv", "pdf"]
  max_file_size: "100MB"
anonymization:
  default_action: "redact"
  preserve_format: true
  audit_trail: true`;

export function YAMLEditor({ 
  initialYaml = SAMPLE_YAML, 
  onSave, 
  onValidChange, 
  readonly = false,
  className = ''
}: YAMLEditorProps) {
  const [yamlContent, setYamlContent] = useState(initialYaml);
  const [validationResult, setValidationResult] = useState<YAMLValidationResult>({ isValid: true });
  const [isValidating, setIsValidating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Update content when initialYaml changes (for loading new policies)
  useEffect(() => {
    if (initialYaml !== yamlContent && !hasUnsavedChanges) {
      setYamlContent(initialYaml);
      lastValidationRef.current = '';
    }
  }, [initialYaml, yamlContent, hasUnsavedChanges]);
  
  // Ref to track if we've already called onValidChange for the current result
  const lastValidationRef = useRef<string>('');
  
  const { validateYAML } = usePolicies();
  const { toast } = useToast();

  // Memoized validation function to prevent recreating on every render
  const validateYAMLContent = useCallback(async (yaml: string) => {
    // Skip validation if content hasn't changed
    if (lastValidationRef.current === yaml) {
      return;
    }
    
    lastValidationRef.current = yaml;
    
    if (!yaml.trim()) {
      const result = { isValid: false, errors: ['YAML content cannot be empty'] };
      setValidationResult(result);
      onValidChange?.(false, result);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateYAML(yaml);
      setValidationResult(result);
      onValidChange?.(result.isValid, result);
    } catch (error) {
      const result = { isValid: false, errors: ['Failed to validate YAML'] };
      setValidationResult(result);
      onValidChange?.(false, result);
    } finally {
      setIsValidating(false);
    }
  }, [validateYAML, onValidChange]);

  // Debounced validation function - stable reference
  const debouncedValidation = useCallback(
    debounce(validateYAMLContent, 500),
    [validateYAMLContent]
  );

  // Validate on content change - simplified dependency array
  useEffect(() => {
    if (yamlContent !== lastValidationRef.current) {
      debouncedValidation(yamlContent);
    }
    setHasUnsavedChanges(yamlContent !== initialYaml);
  }, [yamlContent, initialYaml, debouncedValidation]);

  const handleSave = useCallback(() => {
    if (validationResult.isValid && onSave) {
      onSave(yamlContent);
      setHasUnsavedChanges(false);
      toast({
        title: 'Policy saved',
        description: 'Your YAML policy has been saved successfully.',
      });
    }
  }, [yamlContent, validationResult.isValid, onSave, toast]);

  const handleReset = useCallback(() => {
    setYamlContent(initialYaml);
    setHasUnsavedChanges(false);
  }, [initialYaml]);

  const getValidationIcon = () => {
    if (isValidating) {
      return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
    }
    
    if (validationResult.isValid) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getValidationStatus = () => {
    if (isValidating) {
      return <Badge variant="secondary">Validating...</Badge>;
    }
    
    if (validationResult.isValid) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Valid YAML</Badge>;
    }
    
    return <Badge variant="secondary" className="bg-red-100 text-red-800">Invalid YAML</Badge>;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="text-lg">YAML Policy Editor</CardTitle>
              {getValidationIcon()}
              {getValidationStatus()}
            </div>
            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Unsaved Changes
                </Badge>
              )}
              {!readonly && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReset}
                    disabled={!hasUnsavedChanges}
                    className="h-[34px]"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={!validationResult.isValid || !hasUnsavedChanges}
                    className="h-[34px]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Policy
                  </Button>
                </>
              )}
              {readonly && (
                <Button variant="outline" size="sm" className="h-[34px]">
                  <Eye className="w-4 h-4 mr-2" />
                  View Only
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* YAML Editor Textarea */}
          <div className="relative">
            <textarea
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              readOnly={readonly}
              className={`w-full h-96 p-4 font-mono text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                readonly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              } ${
                validationResult.isValid ? 'border-gray-300' : 'border-red-300'
              }`}
              placeholder="Enter your YAML policy configuration here..."
              spellCheck={false}
            />
            {/* Line numbers could be added here in the future */}
          </div>

          {/* Validation Results */}
          {validationResult.errors && validationResult.errors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="font-medium text-red-800 mb-2">YAML Validation Errors:</div>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {validationResult.errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Valid YAML Success Message */}
          {validationResult.isValid && !isValidating && yamlContent.trim() && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium">YAML is valid!</div>
                <div className="text-sm mt-1">
                  Your policy configuration has been successfully validated and is ready to use.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* YAML Help */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">YAML Policy Structure Help</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>name:</strong> Policy name (required)</div>
                <div><strong>version:</strong> Semantic version like "1.0.0" (required)</div>
                <div><strong>description:</strong> Policy description (required)</div>
                <div><strong>detection.entities:</strong> Array of PII entities to detect</div>
                <div><strong>scope.file_types:</strong> Supported file types: txt, csv, pdf, docx, xlsx, etc.</div>
                <div><strong>anonymization:</strong> Default anonymization settings</div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Supported entity types: EMAIL_ADDRESS, SSN, CREDIT_CARD, PHONE_NUMBER, PERSON, 
                IP_ADDRESS, DATE_TIME, LOCATION, ORGANIZATION, MEDICAL_LICENSE, URL
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

export default YAMLEditor;