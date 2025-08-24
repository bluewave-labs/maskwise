'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Counter from '@/components/ui/counter';
import { api } from '@/lib/api';
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Users, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';

// Types for system health data
interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime: number;
  uptime: string;
  message: string;
  lastCheck: string;
  metadata?: Record<string, any>;
}

interface SystemResources {
  cpuUsage: number;
  memoryUsage: number;
  totalMemory: number;
  usedMemory: number;
  diskUsage: number;
  totalDisk: number;
  usedDisk: number;
}

interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  workers: number;
}

interface ApplicationMetrics {
  totalUsers: number;
  activeUsers: number;
  totalDatasets: number;
  totalFindings: number;
  averageProcessingTime: number;
  successRate: number;
}

interface SystemHealthData {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: string;
  version: string;
  uptime: number;
  services: ServiceHealth[];
  resources: SystemResources;
  queues: QueueStatus[];
  metrics: ApplicationMetrics;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'unhealthy':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    unhealthy: 'bg-red-100 text-red-800 border-red-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <Badge variant="outline" className={variants[status as keyof typeof variants] || variants.unknown}>
      <StatusIcon status={status} />
      <span className="ml-1 capitalize">{status}</span>
    </Badge>
  );
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Traffic Light System color scheme
const getUsageColor = (percentage: number) => {
  if (percentage <= 60) {
    return {
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500',
      barColor: 'bg-green-500',
      textColor: 'text-green-600'
    };
  } else if (percentage <= 80) {
    return {
      bgColor: 'bg-yellow-500/20', 
      borderColor: 'border-yellow-500',
      barColor: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    };
  } else {
    return {
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500', 
      barColor: 'bg-red-500',
      textColor: 'text-red-600'
    };
  }
};

export default function SystemHealthDashboard() {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealthData = async () => {
    try {
      setError(null);
      const response = await api.get('/system/health');
      setHealthData(response.data);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch system health data');
      console.error('Health data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchHealthData();
  };

  if (isLoading && !healthData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={handleRefresh} size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-[13px] font-normal text-red-800 mb-2">Failed to Load System Health</h3>
            <p className="text-[13px] text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-4 text-[13px] text-muted-foreground">
            <span>Version: <span className="font-mono font-normal text-foreground">{healthData?.version || 'Unknown'}</span></span>
            <span>Uptime: <span className="font-mono font-normal text-foreground">{healthData ? formatUptime(healthData.uptime) : 'Unknown'}</span></span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdate && (
            <span className="text-[13px] text-muted-foreground">
              Last Updated: <span className="font-mono font-normal text-foreground">{lastUpdate.toLocaleTimeString()}</span>
            </span>
          )}
          <Button onClick={handleRefresh} size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[13px] font-normal text-muted-foreground">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-normal mb-2 font-mono font-medium ${getUsageColor(healthData?.resources?.cpuUsage || 0).textColor}`}>
              <Counter 
                value={healthData?.resources?.cpuUsage || 0} 
                format="percentage"
                delay={0}
              />
            </div>
            <div className={`rounded-full h-2 ${getUsageColor(healthData?.resources?.cpuUsage || 0).bgColor} border ${getUsageColor(healthData?.resources?.cpuUsage || 0).borderColor}`}>
              <div 
                className={`h-full rounded-full transition-all duration-300 ${getUsageColor(healthData?.resources?.cpuUsage || 0).barColor}`}
                style={{ width: `${healthData?.resources?.cpuUsage || 0}%` }}
              />
            </div>
            <p className="text-[13px] text-muted-foreground mt-2">
              System processor utilization
            </p>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[13px] font-normal text-muted-foreground">Memory Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-normal mb-2 font-mono font-medium ${getUsageColor(healthData?.resources?.memoryUsage || 0).textColor}`}>
              <Counter 
                value={healthData?.resources?.memoryUsage || 0} 
                format="percentage"
                delay={0.05}
              />
            </div>
            <div className={`rounded-full h-2 ${getUsageColor(healthData?.resources?.memoryUsage || 0).bgColor} border ${getUsageColor(healthData?.resources?.memoryUsage || 0).borderColor}`}>
              <div 
                className={`h-full rounded-full transition-all duration-300 ${getUsageColor(healthData?.resources?.memoryUsage || 0).barColor}`}
                style={{ width: `${healthData?.resources?.memoryUsage || 0}%` }}
              />
            </div>
            <p className="text-[13px] text-muted-foreground mt-2 font-mono font-medium">
              {formatBytes((healthData?.resources?.usedMemory || 0) * 1024 * 1024)} / {formatBytes((healthData?.resources?.totalMemory || 0) * 1024 * 1024)}
            </p>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[13px] font-normal text-muted-foreground">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-normal mb-2 font-mono font-medium ${getUsageColor(healthData?.resources?.diskUsage || 0).textColor}`}>
              <Counter 
                value={healthData?.resources?.diskUsage || 0} 
                format="percentage"
                delay={0.1}
              />
            </div>
            <div className={`rounded-full h-2 ${getUsageColor(healthData?.resources?.diskUsage || 0).bgColor} border ${getUsageColor(healthData?.resources?.diskUsage || 0).borderColor}`}>
              <div 
                className={`h-full rounded-full transition-all duration-300 ${getUsageColor(healthData?.resources?.diskUsage || 0).barColor}`}
                style={{ width: `${healthData?.resources?.diskUsage || 0}%` }}
              />
            </div>
            <p className="text-[13px] text-muted-foreground mt-2 font-mono font-medium">
              {formatBytes((healthData?.resources?.usedDisk || 0) * 1024 * 1024)} / {formatBytes((healthData?.resources?.totalDisk || 0) * 1024 * 1024)}
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[13px] font-normal text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-foreground mb-2 font-mono font-medium">
              <Counter 
                value={healthData?.metrics?.activeUsers || 0} 
                delay={0.15}
              />
            </div>
            <p className="text-[13px] text-muted-foreground">
              <span className="font-mono font-medium">{healthData?.metrics?.totalUsers || 0}</span> total users
            </p>
            <p className="text-[13px] text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[13px] font-normal text-foreground flex items-center">
            <Server className="h-4 w-4 mr-2" />
            Service Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthData?.services?.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <StatusIcon status={service.status} />
                  <div>
                    <p className="text-[13px] font-normal text-foreground capitalize">{service.name}</p>
                    <p className="text-[13px] text-muted-foreground">{service.responseTime}ms</p>
                  </div>
                </div>
                <StatusBadge status={service.status} />
              </div>
            )) || (
              <p className="text-[13px] text-muted-foreground col-span-3 text-center py-4">
                No service data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[13px] font-normal text-foreground flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Job Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {healthData?.queues?.map((queue) => (
              <div key={queue.name} className="p-4 border rounded-lg">
                <h4 className="text-[13px] font-normal text-foreground mb-3">
                  {queue.name === 'pii-analysis' ? 'PII Analysis' : 
                   queue.name === 'file-processing' ? 'File Processing' :
                   queue.name === 'anonymization' ? 'Anonymization' :
                   queue.name.replace('-', ' ')}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Waiting:</span>
                    <span className="text-foreground">{queue.waiting}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Active:</span>
                    <span className="text-foreground">{queue.active}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="text-green-600">{queue.completed}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Failed:</span>
                    <span className="text-red-600">{queue.failed}</span>
                  </div>
                </div>
              </div>
            )) || (
              <p className="text-[13px] text-muted-foreground col-span-4 text-center py-4">
                No queue data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Application Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-normal text-foreground flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">Average Processing Time:</span>
                <span className="text-[13px] text-foreground">{healthData?.metrics?.averageProcessingTime || 0}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">Success Rate:</span>
                <span className="text-[13px] text-foreground">{healthData?.metrics?.successRate || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">Total Datasets:</span>
                <span className="text-[13px] text-foreground">{healthData?.metrics?.totalDatasets || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">PII Findings:</span>
                <span className="text-[13px] text-foreground">{healthData?.metrics?.totalFindings || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-normal text-foreground flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">Platform:</span>
                <span className="text-[13px] text-foreground">Maskwise PII Detection</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">Version:</span>
                <span className="text-[13px] text-foreground">{healthData?.version || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">Environment:</span>
                <span className="text-[13px] text-foreground">Development</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted-foreground">Status:</span>
                <StatusBadge status={healthData?.overallStatus || 'unknown'} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}