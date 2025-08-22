'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Upload, 
  File, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Eye, 
  Shield, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';

interface FileUploadProps {
  projectId?: string;
  policyId?: string;
  onUploadComplete?: (result: any) => void;
  onPolicySelect?: (policyId: string) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'validating' | 'preview';
  error?: string;
  result?: any;
  preview?: {
    type: 'text' | 'image' | 'metadata';
    content: string;
    isSecure: boolean;
    warnings: string[];
  };
  validation?: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  retryCount?: number;
}

export function FileUpload({ 
  projectId, 
  policyId,
  onUploadComplete, 
  onPolicySelect,
  maxFileSize = 100,
  acceptedTypes = [
    'text/plain',
    'text/csv', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/tiff'
  ]
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): { error: string | null; warnings: string[]; riskLevel: 'low' | 'medium' | 'high' } => {
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return { error: `File size exceeds ${maxFileSize}MB limit`, warnings, riskLevel: 'high' };
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return { error: `File type ${file.type} is not supported`, warnings, riskLevel: 'high' };
    }

    // Security warnings for filename
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      warnings.push('Filename contains potentially unsafe characters');
      riskLevel = 'medium';
    }

    // Check for suspicious extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension && suspiciousExtensions.includes(`.${extension}`)) {
      warnings.push('File has an executable extension - please verify this is intentional');
      riskLevel = 'high';
    }

    // Check for double extensions
    const parts = file.name.split('.');
    if (parts.length > 2) {
      warnings.push('File has multiple extensions - this can sometimes indicate malicious files');
      riskLevel = 'medium';
    }

    // Large file warning
    if (file.size > 50 * 1024 * 1024) { // 50MB
      warnings.push('Large file detected - upload may take longer and consume more resources');
    }

    // Binary file detection for text types
    if (file.type.startsWith('text/') && file.size > 10 * 1024 * 1024) { // 10MB text file
      warnings.push('Very large text file - consider splitting into smaller chunks for better performance');
    }

    return { error: null, warnings, riskLevel };
  };

  const generateFilePreview = async (file: File): Promise<UploadFile['preview'] | null> => {
    try {
      const warnings: string[] = [];
      let isSecure = true;

      if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.csv')) {
        // Text file preview
        const text = await file.text();
        const preview = text.substring(0, 500); // First 500 characters
        
        // Check for suspicious content
        const suspiciousPatterns = ['<script', 'javascript:', 'eval(', 'exec(', 'base64'];
        for (const pattern of suspiciousPatterns) {
          if (text.toLowerCase().includes(pattern)) {
            warnings.push(`Potentially suspicious content detected: ${pattern}`);
            isSecure = false;
          }
        }

        return {
          type: 'text',
          content: preview + (text.length > 500 ? '\n... (truncated)' : ''),
          isSecure,
          warnings
        };
      } else if (file.type.startsWith('image/')) {
        // Image preview
        const url = URL.createObjectURL(file);
        return {
          type: 'image',
          content: url,
          isSecure: true,
          warnings: []
        };
      } else {
        // Metadata preview for other files
        return {
          type: 'metadata',
          content: `File type: ${file.type || 'Unknown'}\nSize: ${formatFileSize(file.size)}\nLast modified: ${new Date(file.lastModified).toLocaleString()}`,
          isSecure: true,
          warnings: []
        };
      }
    } catch (error) {
      return {
        type: 'metadata',
        content: `Error generating preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isSecure: false,
        warnings: ['Failed to generate file preview']
      };
    }
  };

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = [];

    for (const file of fileArray) {
      const validation = validateFile(file);
      const uploadFile: UploadFile = {
        file,
        id: generateId(),
        progress: 0,
        status: validation.error ? 'error' : 'validating',
        error: validation.error || undefined,
        validation: {
          isValid: !validation.error,
          warnings: validation.warnings,
          errors: validation.error ? [validation.error] : [],
          riskLevel: validation.riskLevel
        },
        retryCount: 0
      };

      uploadFiles.push(uploadFile);
    }

    setFiles(prev => [...prev, ...uploadFiles]);

    // Generate previews for valid files
    for (const uploadFile of uploadFiles) {
      if (!uploadFile.error) {
        try {
          const preview = await generateFilePreview(uploadFile.file);
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, preview, status: 'pending' as const }
              : f
          ));
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'pending' as const }
              : f
          ));
        }
      }
    }

    // Show validation messages
    uploadFiles.forEach(uploadFile => {
      if (uploadFile.error) {
        toast({
          title: 'File validation failed',
          description: `${uploadFile.file.name}: ${uploadFile.error}`,
          variant: 'destructive'
        });
      } else if (uploadFile.validation?.warnings.length) {
        toast({
          title: 'File validation warnings',
          description: `${uploadFile.file.name}: ${uploadFile.validation.warnings.join(', ')}`,
          variant: 'default'
        });
      }
    });
  }, [maxFileSize, acceptedTypes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    if (!projectId) {
      throw new Error('Project ID is required for upload');
    }

    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('projectId', projectId);
    if (policyId) {
      formData.append('policyId', policyId);
    }
    if (description.trim()) {
      formData.append('description', description.trim());
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const xhr = new XMLHttpRequest();
    let timeoutId: NodeJS.Timeout;

    return new Promise((resolve, reject) => {
      // Set upload timeout based on file size (minimum 30s, +1s per MB)
      const timeoutMs = Math.max(30000, uploadFile.file.size / 1024 / 1024 * 1000);
      timeoutId = setTimeout(() => {
        xhr.abort();
        reject(new Error('Upload timeout - file may be too large or connection is slow'));
      }, timeoutMs);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, progress } : f
          ));
        }
      });

      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'completed' as const, progress: 100, result }
                : f
            ));
            resolve();
            
            toast({
              title: 'Upload successful',
              description: `${uploadFile.file.name} has been uploaded and queued for analysis`,
            });

            if (onUploadComplete) {
              onUploadComplete(result);
            }
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          let errorMessage = `HTTP ${xhr.status}`;
          let isRetryable = false;
          
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorMessage;
            
            // Determine if error is retryable
            if (xhr.status >= 500 || xhr.status === 429 || xhr.status === 408) {
              isRetryable = true;
            }
          } catch (e) {
            // Network errors are typically retryable
            if (xhr.status >= 500) {
              isRetryable = true;
            }
          }
          
          const error = new Error(errorMessage) as any;
          error.isRetryable = isRetryable;
          error.statusCode = xhr.status;
          reject(error);
        }
      });

      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        const error = new Error('Network error occurred') as any;
        error.isRetryable = true;
        reject(error);
      });

      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('POST', 'http://localhost:3001/datasets/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const retryUpload = async (uploadFile: UploadFile) => {
    const maxRetries = 3;
    const currentRetryCount = uploadFile.retryCount || 0;
    
    if (currentRetryCount >= maxRetries) {
      toast({
        title: 'Upload failed',
        description: `${uploadFile.file.name}: Maximum retry attempts reached`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' as const, error: undefined, progress: 0, retryCount: currentRetryCount + 1 }
          : f
      ));
      
      await uploadFile(uploadFile);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      const isRetryable = error.isRetryable !== false;
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error' as const, error: errorMessage }
          : f
      ));
      
      if (isRetryable && currentRetryCount < maxRetries - 1) {
        toast({
          title: 'Upload failed - retrying',
          description: `${uploadFile.file.name}: ${errorMessage}. Retry ${currentRetryCount + 1}/${maxRetries}`,
          variant: 'destructive'
        });
        
        // Auto-retry with exponential backoff
        setTimeout(() => retryUpload(uploadFile), Math.pow(2, currentRetryCount) * 1000);
      } else {
        toast({
          title: 'Upload failed',
          description: `${uploadFile.file.name}: ${errorMessage}`,
          variant: 'destructive'
        });
      }
    }
  };

  const uploadAllFiles = async () => {
    if (!projectId) {
      toast({
        title: 'Project required',
        description: 'Please select a project before uploading files',
        variant: 'destructive'
      });
      return;
    }

    const pendingFiles = files.filter(f => f.status === 'pending');
    
    // Check for high-risk files
    const highRiskFiles = pendingFiles.filter(f => f.validation?.riskLevel === 'high');
    if (highRiskFiles.length > 0) {
      const proceed = window.confirm(
        `Warning: ${highRiskFiles.length} file(s) have high security risk. Are you sure you want to proceed?`
      );
      if (!proceed) return;
    }
    
    for (const uploadFile of pendingFiles) {
      try {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f
        ));
        
        await uploadFile(uploadFile);
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        const isRetryable = error.isRetryable !== false;
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        ));
        
        if (!isRetryable) {
          toast({
            title: 'Upload failed',
            description: `${uploadFile.file.name}: ${errorMessage}`,
            variant: 'destructive'
          });
        }
      }
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const togglePreview = (id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id 
        ? { ...f, status: f.status === 'preview' ? 'pending' : 'preview' as const }
        : f
    ));
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'validating':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'preview':
        return <Eye className="h-4 w-4 text-blue-500" />;
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    } else if (file.type.includes('spreadsheet') || file.name.endsWith('.csv')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    } else {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskLevelBadge = (riskLevel: 'low' | 'medium' | 'high') => {
    const variants = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    return (
      <Badge className={`${variants[riskLevel]} text-xs`}>
        <Shield className="h-3 w-3 mr-1" />
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const highRiskCount = files.filter(f => f.validation?.riskLevel === 'high').length;
  const hasWarnings = files.some(f => f.validation?.warnings.length > 0 || f.preview?.warnings.length > 0);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Describe this dataset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drop files here or click to upload</h3>
            <p className="text-muted-foreground mb-2">
              Support for TXT, CSV, PDF, DOCX, XLSX, JPEG, PNG, TIFF files up to {maxFileSize}MB
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Automatic security scanning</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>File preview available</span>
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>Auto-retry on failure</span>
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Files ({files.length})
                {hasWarnings && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Warnings
                  </Badge>
                )}
                {highRiskCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {highRiskCount} High Risk
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                {pendingCount > 0 && <span>Pending: {pendingCount}</span>}
                {uploadingCount > 0 && <span>Uploading: {uploadingCount}</span>}
                {completedCount > 0 && <span>Completed: {completedCount}</span>}
                {errorCount > 0 && <span className="text-red-500">Failed: {errorCount}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {completedCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed ({completedCount})
                </Button>
              )}
              {pendingCount > 0 && (
                <Button 
                  onClick={uploadAllFiles}
                  disabled={uploadingCount > 0 || !projectId}
                  size="sm"
                  className={highRiskCount > 0 ? 'bg-orange-600 hover:bg-orange-700' : ''}
                >
                  {uploadingCount > 0 
                    ? `Uploading... (${uploadingCount})` 
                    : `Upload All (${pendingCount})${highRiskCount > 0 ? ' ⚠️' : ''}`
                  }
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div key={uploadFile.id} className="border border-muted rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-muted/30">
                  <div className="flex-shrink-0">
                    {getStatusIcon(uploadFile.status)}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(uploadFile.file.size)}
                        </span>
                        {uploadFile.validation && (
                          getRiskLevelBadge(uploadFile.validation.riskLevel)
                        )}
                      </div>
                    </div>
                    
                    {/* Status and Progress */}
                    {uploadFile.status === 'validating' && (
                      <p className="text-xs text-blue-600">Validating file...</p>
                    )}
                    
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-1">
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {uploadFile.progress}% uploaded {uploadFile.retryCount ? `(Retry ${uploadFile.retryCount})` : ''}
                        </p>
                      </div>
                    )}
                    
                    {/* Validation Warnings */}
                    {uploadFile.validation?.warnings.length > 0 && (
                      <div className="mt-1 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-600">
                          {uploadFile.validation.warnings.map((warning, idx) => (
                            <div key={idx}>{warning}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Error with Retry Option */}
                    {uploadFile.error && (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-red-500 flex-1">
                          {uploadFile.error}
                        </p>
                        {uploadFile.retryCount !== undefined && uploadFile.retryCount < 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryUpload(uploadFile)}
                            className="h-6 px-2 text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Success Status */}
                    {uploadFile.status === 'completed' && uploadFile.result && (
                      <div className="mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <p className="text-xs text-green-600">
                          Job ID: {uploadFile.result.job?.id} - Analysis queued
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Preview Button */}
                    {uploadFile.preview && uploadFile.status !== 'uploading' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePreview(uploadFile.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={uploadFile.status === 'uploading' || uploadFile.status === 'validating'}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* File Preview */}
                {uploadFile.status === 'preview' && uploadFile.preview && (
                  <div className="p-4 border-t bg-muted/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        File Preview
                      </h4>
                      {!uploadFile.preview.isSecure && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Security Warning
                        </Badge>
                      )}
                    </div>
                    
                    {uploadFile.preview.warnings.length > 0 && (
                      <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            <p className="font-medium mb-1">Preview Warnings:</p>
                            {uploadFile.preview.warnings.map((warning, idx) => (
                              <p key={idx} className="text-xs">• {warning}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-background border rounded p-3 max-h-64 overflow-auto">
                      {uploadFile.preview.type === 'image' ? (
                        <img 
                          src={uploadFile.preview.content} 
                          alt={uploadFile.file.name}
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: '200px' }}
                        />
                      ) : (
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                          {uploadFile.preview.content}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}