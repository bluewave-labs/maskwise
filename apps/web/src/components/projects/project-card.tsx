'use client';

import { useState } from 'react';
import { Project } from '@/types/project';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  Calendar, 
  FileText, 
  HardDrive,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Settings
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onView?: (project: Project) => void;
  onManageFiles?: (project: Project) => void;
}

export function ProjectCard({ 
  project, 
  onEdit, 
  onDelete, 
  onView,
  onManageFiles 
}: ProjectCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card className="relative group hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Created {formatDate(project.createdAt)}
              </p>
            </div>
          </div>
          
          {/* Actions Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {showActions && (
              <div className="absolute right-0 top-8 w-48 bg-popover border rounded-md shadow-lg z-10">
                <div className="py-1">
                  {onView && (
                    <button
                      onClick={() => {
                        onView(project);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent w-full text-left"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  )}
                  {onManageFiles && (
                    <button
                      onClick={() => {
                        onManageFiles(project);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent w-full text-left"
                    >
                      <FileText className="h-4 w-4" />
                      Manage Files
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(project);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent w-full text-left"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Project
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(project);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent w-full text-left text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{project.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {project._count?.datasets || 0}
              </p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {project.totalSize ? formatFileSize(project.totalSize) : '0 B'}
              </p>
              <p className="text-xs text-muted-foreground">Storage</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          {onManageFiles && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageFiles(project)}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Files
            </Button>
          )}
          {onView && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onView(project)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </div>

        {/* Status Indicator */}
        <div className="absolute top-4 right-4">
          <div className={`w-2 h-2 rounded-full ${
            project.isActive ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
      </div>

      {/* Click outside to close actions */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </Card>
  );
}