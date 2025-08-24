'use client';

import { Bell, Clock, User, FileText, Shield, Database, FolderOpen, LogIn, LogOut, Upload, Download, Eye, Trash, Edit } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { AuditAction, AuditLog } from '@/types/audit';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
  CREATE: 'text-green-400',
  UPDATE: 'text-blue-400',
  DELETE: 'text-red-400',
  VIEW: 'text-gray-400',
  DOWNLOAD: 'text-purple-400',
  UPLOAD: 'text-indigo-400',
  LOGIN: 'text-emerald-400',
  LOGOUT: 'text-orange-400',
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

export function NotificationIcon() {
  const { activities, isLoading, error, refetch } = useRecentActivity(10);

  // Show red dot if there are recent activities (within last 24 hours)
  const hasRecentActivity = activities && activities.length > 0 && 
    activities.some(activity => {
      const activityDate = new Date(activity.createdAt);
      const now = new Date();
      const diffInHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
      return diffInHours <= 24;
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-4 w-4" />
          {hasRecentActivity && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0 border-0 shadow-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="relative overflow-hidden rounded-xl">
          {/* Background gradients and effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-gray-900 opacity-50" />
          <div className="absolute inset-0 bg-gray-50/5 opacity-30" />
          
          {/* Header */}
          <div className="relative z-10 p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
                  <p className="text-gray-400 text-xs">Latest system events</p>
                </div>
              </div>
              {hasRecentActivity && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-blue-400 text-xs">Live</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          {error ? (
            <div className="relative z-10 p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Bell className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 text-sm font-medium mb-1">Failed to load activity</p>
                  <p className="text-gray-400 text-xs mb-3">Unable to fetch recent events</p>
                  <button
                    onClick={refetch}
                    className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="relative z-10 flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Spinner size="sm" className="text-blue-400" />
                </div>
                <span className="text-gray-300 text-sm">Loading activity...</span>
              </div>
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="relative z-10 p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gray-700/50 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm font-medium">No recent activity</p>
                  <p className="text-gray-500 text-xs">Your activity will appear here</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10 max-h-80 overflow-y-auto">
              {activities.map((activity, index) => {
                const ResourceIcon = getResourceIcon(activity.resource);
                const ActionIcon = actionIcons[activity.action];
                const actionColor = actionColors[activity.action];
                
                // Check if activity is recent (within 6 hours)
                const activityDate = new Date(activity.createdAt);
                const now = new Date();
                const diffInHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
                const isRecent = diffInHours <= 6;
                
                return (
                  <div key={activity.id} className="group">
                    <div className="relative flex items-center py-5 pl-6 pr-8 hover:bg-gray-800/30 transition-all duration-200">
                      {/* Left border indicator for recent activities */}
                      {isRecent && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full" />
                      )}
                      
                      <div className="flex items-center flex-1 min-w-0">
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                            {formatActionText(activity)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                              {formatTimestamp(activity.createdAt)}
                            </p>
                            {activity.metadata && (
                              <>
                                <div className="w-1 h-1 bg-gray-500 rounded-full" />
                                <p className="text-xs text-gray-500 truncate max-w-32">
                                  {activity.metadata.ip || 'System'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < activities.length - 1 && (
                      <div className="mx-6 border-b border-gray-700/30" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}