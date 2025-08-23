export interface Policy {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  config: any; // JSON config
  version: string;
  createdAt: string;
  updatedAt: string;
  versions?: PolicyVersion[];
  _count?: {
    versions: number;
  };
}

export interface PolicyVersion {
  id: string;
  version: string;
  config: any; // JSON config
  changelog: string | null;
  isActive: boolean;
  createdAt: string;
  policyId: string;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'GENERAL' | 'HEALTHCARE' | 'FINANCE' | 'LEGAL' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'CUSTOM';
  config: any; // JSON config
  tags: string[];
  downloads: number;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyDto {
  name: string;
  description: string;
  yamlContent: string;
  tags?: string[];
  isActive?: boolean;
}

export interface UpdatePolicyDto {
  name?: string;
  description?: string;
  yamlContent?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface PolicyListResponse {
  policies: Policy[];
  total: number;
  pages: number;
}

export interface YAMLValidationResult {
  isValid: boolean;
  parsed?: any;
  errors?: string[];
}

// Policy status variants for UI
export type PolicyStatus = 'active' | 'inactive' | 'draft';

// Category colors for UI
export const CATEGORY_COLORS: Record<PolicyTemplate['category'], string> = {
  GENERAL: 'bg-gray-100 text-gray-800',
  HEALTHCARE: 'bg-green-100 text-green-800',
  FINANCE: 'bg-blue-100 text-blue-800',
  LEGAL: 'bg-purple-100 text-purple-800',
  GDPR: 'bg-yellow-100 text-yellow-800',
  HIPAA: 'bg-green-100 text-green-800',
  PCI_DSS: 'bg-blue-100 text-blue-800',
  CUSTOM: 'bg-indigo-100 text-indigo-800',
};

// Policy action colors for UI
export const STATUS_COLORS: Record<PolicyStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  draft: 'bg-yellow-100 text-yellow-800',
};