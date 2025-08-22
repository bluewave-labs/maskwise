export interface Project {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  userId: string;
  
  // Statistics (may be populated by API)
  _count?: {
    datasets: number;
  };
  totalFiles?: number;
  totalSize?: number;
  lastActivity?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface ProjectStats {
  totalFiles: number;
  totalSize: number;
  breakdown: {
    fileType: string;
    status: string;
    count: number;
    totalSize: number;
  }[];
}