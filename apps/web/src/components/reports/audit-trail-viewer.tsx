'use client';

import { AuditTrailEntry } from '@/types/compliance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UserIcon,
  FileTextIcon,
  ShieldIcon,
  DatabaseIcon,
  UploadIcon,
  SettingsIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  PlayIcon,
  StopCircleIcon
} from 'lucide-react';

interface AuditTrailViewerProps {
  data: AuditTrailEntry[];
}

const ACTION_ICONS = {
  LOGIN: UserIcon,
  LOGOUT: UserIcon,
  DATASET_CREATED: UploadIcon,
  DATASET_UPDATED: EditIcon,
  DATASET_DELETED: TrashIcon,
  DATASET_VIEWED: EyeIcon,
  POLICY_CREATED: ShieldIcon,
  POLICY_UPDATED: ShieldIcon,
  POLICY_DELETED: ShieldIcon,
  PROJECT_CREATED: FileTextIcon,
  PROJECT_UPDATED: FileTextIcon,
  PROJECT_DELETED: FileTextIcon,
  JOB_STARTED: PlayIcon,
  JOB_COMPLETED: StopCircleIcon,
  JOB_FAILED: StopCircleIcon,
  SETTINGS_UPDATED: SettingsIcon,
  DEFAULT: DatabaseIcon,
};

const ACTION_COLORS = {
  LOGIN: 'text-green-600',
  LOGOUT: 'text-gray-600',
  DATASET_CREATED: 'text-blue-600',
  DATASET_UPDATED: 'text-orange-600',
  DATASET_DELETED: 'text-red-600',
  DATASET_VIEWED: 'text-blue-600',
  POLICY_CREATED: 'text-purple-600',
  POLICY_UPDATED: 'text-purple-600',
  POLICY_DELETED: 'text-red-600',
  PROJECT_CREATED: 'text-green-600',
  PROJECT_UPDATED: 'text-orange-600',
  PROJECT_DELETED: 'text-red-600',
  JOB_STARTED: 'text-blue-600',
  JOB_COMPLETED: 'text-green-600',
  JOB_FAILED: 'text-red-600',
  SETTINGS_UPDATED: 'text-gray-600',
  DEFAULT: 'text-gray-600',
};

export function AuditTrailViewer({ data }: AuditTrailViewerProps) {
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action as keyof typeof ACTION_ICONS] || ACTION_ICONS.DEFAULT;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action as keyof typeof ACTION_COLORS] || ACTION_COLORS.DEFAULT;
  };

  const formatActionText = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDetails = (details: any) => {
    if (!details || typeof details !== 'object') return null;
    
    const relevantKeys = Object.keys(details).filter(key => 
      !['timestamp', 'id', 'userId'].includes(key) && details[key] != null
    );
    
    if (relevantKeys.length === 0) return null;
    
    return relevantKeys.slice(0, 3).map(key => (
      <span key={key} className="text-xs text-muted-foreground">
        {key}: {String(details[key]).substring(0, 50)}
        {String(details[key]).length > 50 ? '...' : ''}
      </span>
    ));
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATED')) return 'default';
    if (action.includes('UPDATED')) return 'secondary';
    if (action.includes('DELETED') || action.includes('FAILED')) return 'destructive';
    if (action.includes('COMPLETED')) return 'default';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold">Recent Activity Trail</CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Comprehensive audit log of user actions and system events
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DatabaseIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit trail entries found</p>
            </div>
          ) : (
            data.map((entry) => {
              const ActionIcon = getActionIcon(entry.action);
              const actionColor = getActionColor(entry.action);
              const details = formatDetails(entry.details);
              
              return (
                <div key={entry.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={`flex-shrink-0 ${actionColor}`}>
                    <ActionIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatActionText(entry.action)}
                        </span>
                        <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
                          {entry.resourceType}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">User: </span>
                        <span className="font-medium">{entry.userEmail}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP: </span>
                        <span>{entry.ipAddress}</span>
                      </div>
                      {entry.resourceId && (
                        <div>
                          <span className="text-muted-foreground">Resource: </span>
                          <span className="font-mono text-xs">{entry.resourceId.substring(0, 12)}...</span>
                        </div>
                      )}
                    </div>
                    
                    {details && (
                      <div className="space-y-1 pt-2 border-t border-border/50">
                        {details}
                      </div>
                    )}
                    
                    {entry.userAgent && entry.userAgent !== 'Unknown' && (
                      <div className="text-xs text-muted-foreground truncate">
                        <span>User Agent: </span>
                        {entry.userAgent.substring(0, 100)}
                        {entry.userAgent.length > 100 ? '...' : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}