'use client';

import { Clock, User, FileText, Shield, Database, FolderOpen, LogIn, LogOut, Upload, Download, Eye, Trash, Edit } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { AuditAction, AuditLog } from '@/types/audit';

const actionIcons: Record<AuditAction, React.ComponentType<any>> = {
  CREATE: Edit,
  UPDATE: Edit,
  DELETE: Trash,
  VIEW: Eye,
  DOWNLOAD: Download,
  UPLOAD: Upload,
  LOGIN: LogIn,
  LOGOUT: LogOut,
};

const actionColors: Record<AuditAction, string> = {
  CREATE: 'text-green-600',
  UPDATE: 'text-blue-600',
  DELETE: 'text-red-600',
  VIEW: 'text-gray-600',
  DOWNLOAD: 'text-purple-600',
  UPLOAD: 'text-indigo-600',
  LOGIN: 'text-emerald-600',
  LOGOUT: 'text-orange-600',
};

const resourceIcons: Record<string, React.ComponentType<any>> = {
  user: User,
  project: FolderOpen,
  dataset: Database,
  policy: Shield,
  job: FileText,
};

function getResourceIcon(resource: string) {
  return resourceIcons[resource] || FileText;
}

function formatActionText(activity: AuditLog): string {
  const user = `${activity.user.firstName} ${activity.user.lastName}`;
  const action = activity.action.toLowerCase();
  const resource = activity.resource;

  switch (activity.action) {
    case 'LOGIN':
      return `${user} signed in`;
    case 'LOGOUT':
      return `${user} signed out`;
    case 'CREATE':
      return `${user} created a ${resource}`;
    case 'UPDATE':
      return `${user} updated a ${resource}`;
    case 'DELETE':
      return `${user} deleted a ${resource}`;
    case 'VIEW':
      return `${user} viewed a ${resource}`;
    case 'UPLOAD':
      return `${user} uploaded a ${resource}`;
    case 'DOWNLOAD':
      return `${user} downloaded a ${resource}`;
    default:
      return `${user} performed ${action} on ${resource}`;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function ActivityFeed() {
  const { activities, isLoading, error, refetch } = useRecentActivity(5);

  if (error) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-destructive/15 border border-destructive/50 p-4 rounded-lg">
          <p className="text-destructive font-medium">Failed to load recent activity</p>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm text-destructive underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="sm" className="mr-2" />
          <span className="text-muted-foreground">Loading recent activity...</span>
        </div>
      ) : !activities || activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No recent activity to display</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const ActionIcon = actionIcons[activity.action];
            const ResourceIcon = getResourceIcon(activity.resource);
            const actionColor = actionColors[activity.action];

            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-full bg-accent ${actionColor}`}>
                    <ActionIcon className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <ResourceIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">
                      {formatActionText(activity)}
                    </p>
                  </div>
                  
                  <div className="flex items-center mt-1 space-x-4">
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(activity.createdAt)}
                    </p>
                    
                    {activity.ipAddress && (
                      <p className="text-xs text-muted-foreground">
                        {activity.ipAddress}
                      </p>
                    )}
                  </div>
                  
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-1 p-2 bg-accent rounded text-xs overflow-x-auto">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}