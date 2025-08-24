'use client';

import { useState } from 'react';
import { Project } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FolderOpen, 
  Plus, 
  Search,
  SortAsc,
  SortDesc,
  Edit2,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onViewProject: (project: Project) => void;
  onManageFiles: (project: Project) => void;
}

type SortField = 'name' | 'createdAt' | 'updatedAt' | 'totalFiles';

export function ProjectList({
  projects,
  loading,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onViewProject,
  onManageFiles
}: ProjectListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'totalFiles':
          aValue = a._count?.datasets || 0;
          bValue = b._count?.datasets || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-[34px] w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-[400px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-normal text-foreground mb-2">No Projects Yet</h3>
        <p className="text-[13px] text-muted-foreground mb-6">
          Create your first project to get started with PII detection and data management.
        </p>
        {isAdmin(user) && (
          <Button onClick={onCreateProject} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Project
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-[34px]"
          />
        </div>
        {isAdmin(user) && (
          <Button onClick={onCreateProject} className="h-[34px]">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Results Info */}
      {filteredProjects.length !== projects.length && (
        <div className="text-[13px] text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
        </div>
      )}

      {/* Projects Table */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-muted-foreground">No projects match your search.</p>
          <Button
            variant="outline"
            onClick={() => setSearchTerm('')}
            className="mt-4 h-[34px]"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Project Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('totalFiles')}
                  >
                    <div className="flex items-center gap-2">
                      Datasets
                      {getSortIcon('totalFiles')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center gap-2">
                      Last Updated
                      {getSortIcon('updatedAt')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">Status</th>
                  <th className="text-left p-4 font-normal text-[13px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    className="border-b hover:bg-muted/25 transition-colors cursor-pointer"
                    onClick={() => onViewProject(project)}
                  >
                    <td className="p-4">
                      <div className="font-normal text-[13px]">{project.name}</div>
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {project._count?.datasets || 0}
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatDate(project.createdAt)}
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatDate(project.updatedAt)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-normal ${
                        project.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => onManageFiles(project)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Manage Datasets
                            </DropdownMenuItem>
                            {isAdmin(user) && (
                              <>
                                <DropdownMenuItem onClick={() => onEditProject(project)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Project
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onDeleteProject(project)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Project
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-[13px] text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-[13px] text-muted-foreground">Rows per page:</span>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-[13px] border rounded px-2 py-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[13px] px-3">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}