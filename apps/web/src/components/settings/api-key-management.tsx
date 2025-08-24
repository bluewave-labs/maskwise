'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff,
  AlertCircle,
  Calendar,
  Activity
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiKey {
  id: string;
  name: string;
  prefix: string; // e.g., "mk_live_abcd1234"
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

interface NewApiKey extends ApiKey {
  fullKey: string; // Only available once after generation
}

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<NewApiKey | null>(null);
  const [keyName, setKeyName] = useState('');
  const { toast } = useToast();

  // Fetch API keys from backend
  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api-keys');
      setApiKeys(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch API keys:', error);
      toast({
        title: 'Failed to load API keys',
        description: error.response?.data?.message || 'Please try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your API key.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post('/api-keys', { name: keyName.trim() });
      const { apiKey, fullKey } = response.data;
      
      const newKeyWithFullKey: NewApiKey = {
        ...apiKey,
        fullKey,
      };

      setApiKeys(prev => [apiKey, ...prev]);
      setNewKeyData(newKeyWithFullKey);
      setKeyName('');
      setShowGenerateModal(false);

      toast({
        title: 'API key generated',
        description: 'Your new API key has been generated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'Failed to generate API key. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: 'Copied!',
      description: 'API key copied to clipboard.',
    });
  };

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api-keys/${keyId}`);
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      toast({
        title: 'API key deleted',
        description: `API key "${keyName}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete API key. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (keyId: string) => {
    const currentKey = apiKeys.find(key => key.id === keyId);
    if (!currentKey) return;

    try {
      await api.put(`/api-keys/${keyId}`, { isActive: !currentKey.isActive });
      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, isActive: !key.isActive } : key
      ));
      toast({
        title: 'Status updated',
        description: 'API key status has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update API key status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-[13px] text-muted-foreground">
            Generate and manage API keys for programmatic access to Maskwise
          </p>
        </div>
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogTrigger asChild>
            <Button className="h-[34px]">
              <Plus className="h-4 w-4 mr-2" />
              Generate New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">API Key Name *</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production Dashboard, Mobile App"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="h-[34px]"
                />
                <p className="text-[13px] text-muted-foreground">
                  Choose a descriptive name to help you identify this key
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateModal(false);
                  setKeyName('');
                }}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerateKey} disabled={generating || !keyName.trim()}>
                {generating ? 'Generating...' : 'Generate Key'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Key Display */}
      {newKeyData && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-green-600" />
              <CardTitle className="text-[15px] text-green-800 dark:text-green-200">
                API Key Generated Successfully
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded border">
                <code className="text-[13px] font-mono break-all text-gray-900 dark:text-gray-100">
                  {newKeyData.fullKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyKey(newKeyData.fullKey)}
                  className="ml-2 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2 text-[13px] text-green-700 dark:text-green-300">
                <AlertCircle className="h-4 w-4" />
                <span>Make sure to copy your API key now. You won't be able to see it again!</span>
              </div>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setNewKeyData(null)}
                className="w-full"
              >
                I've saved my key
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-[15px] font-medium text-gray-900 mb-2">No API keys yet</h3>
            <p className="text-[13px] text-gray-600 mb-6">
              Generate your first API key to start using the Maskwise API
            </p>
            <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate API Key
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <Key className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                          {apiKey.name}
                        </h3>
                        <Badge 
                          variant={apiKey.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <code className="text-[13px] font-mono text-gray-600 dark:text-gray-400">
                          {apiKey.prefix}••••••••••••••••••••
                        </code>
                        <div className="flex items-center space-x-3 text-[13px] text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created {formatRelativeTime(apiKey.createdAt)}</span>
                          </div>
                          {apiKey.lastUsedAt && (
                            <div className="flex items-center space-x-1">
                              <Activity className="h-3 w-3" />
                              <span>Used {formatRelativeTime(apiKey.lastUsedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(apiKey.id)}
                      className="h-8"
                    >
                      {apiKey.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteKey(apiKey.id, apiKey.name)}
                      className="h-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* API Documentation Link */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-medium text-blue-800 dark:text-blue-200 mb-1">
                API Documentation
              </h3>
              <p className="text-[13px] text-blue-600 dark:text-blue-300">
                Learn how to authenticate and use the Maskwise API endpoints
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
              View Docs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}