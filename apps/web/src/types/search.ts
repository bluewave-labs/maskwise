/**
 * Search Types & Interfaces
 * 
 * TypeScript definitions for global PII search functionality
 */

export enum EntityType {
  EMAIL_ADDRESS = 'EMAIL_ADDRESS',
  PHONE_NUMBER = 'PHONE_NUMBER',
  CREDIT_CARD = 'CREDIT_CARD',
  SSN = 'SSN',
  PERSON = 'PERSON',
  DATE_TIME = 'DATE_TIME',
  URL = 'URL',
  LOCATION = 'LOCATION',
  ORGANIZATION = 'ORGANIZATION',
  IP_ADDRESS = 'IP_ADDRESS',
  IBAN = 'IBAN',
  US_DRIVER_LICENSE = 'US_DRIVER_LICENSE',
  US_PASSPORT = 'US_PASSPORT',
  MEDICAL_LICENSE = 'MEDICAL_LICENSE',
  UK_NHS = 'UK_NHS'
}

export interface SearchParams {
  query?: string;
  entityTypes?: EntityType[];
  minConfidence?: number;
  maxConfidence?: number;
  dateFrom?: string;
  dateTo?: string;
  projectIds?: string[];
  datasetIds?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'confidence' | 'createdAt' | 'entityType';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchFinding {
  id: string;
  entityType: EntityType;
  maskedText: string;
  context: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
  createdAt: string;
  dataset: {
    id: string;
    name: string;
    filename: string;
    fileType: string;
    project: {
      id: string;
      name: string;
    };
  };
}

export interface SearchMetadata {
  totalResults: number;
  searchQuery?: string;
  appliedFilters: {
    entityTypes?: EntityType[];
    confidenceRange?: [number, number];
    dateRange?: [string, string];
    projects?: number;
    datasets?: number;
  };
  executionTime: number;
}

export interface SearchPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchBreakdown {
  entityType: EntityType;
  count: number;
  avgConfidence: number;
}

export interface SearchResponse {
  findings: SearchFinding[];
  metadata: SearchMetadata;
  pagination: SearchPagination;
  breakdown: SearchBreakdown[];
}

// Tailwind color class mapping for entity types
// IMPORTANT: Classes must be complete strings for Tailwind content scanner to detect them
const colorClassMap = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
} as const;

// Entity type display configuration
export const EntityTypeConfig = {
  [EntityType.EMAIL_ADDRESS]: {
    label: 'Email',
    color: 'blue',
    className: colorClassMap.blue,
    icon: '📧'
  },
  [EntityType.PHONE_NUMBER]: {
    label: 'Phone',
    color: 'green',
    className: colorClassMap.green,
    icon: '📞'
  },
  [EntityType.CREDIT_CARD]: {
    label: 'Credit Card',
    color: 'red',
    className: colorClassMap.red,
    icon: '💳'
  },
  [EntityType.SSN]: {
    label: 'SSN',
    color: 'red',
    className: colorClassMap.red,
    icon: '🆔'
  },
  [EntityType.PERSON]: {
    label: 'Person',
    color: 'purple',
    className: colorClassMap.purple,
    icon: '👤'
  },
  [EntityType.DATE_TIME]: {
    label: 'Date/Time',
    color: 'gray',
    className: colorClassMap.gray,
    icon: '📅'
  },
  [EntityType.URL]: {
    label: 'URL',
    color: 'blue',
    className: colorClassMap.blue,
    icon: '🔗'
  },
  [EntityType.LOCATION]: {
    label: 'Location',
    color: 'green',
    className: colorClassMap.green,
    icon: '📍'
  },
  [EntityType.ORGANIZATION]: {
    label: 'Organization',
    color: 'orange',
    className: colorClassMap.orange,
    icon: '🏢'
  },
  [EntityType.IP_ADDRESS]: {
    label: 'IP Address',
    color: 'gray',
    className: colorClassMap.gray,
    icon: '🌐'
  },
  [EntityType.IBAN]: {
    label: 'IBAN',
    color: 'orange',
    className: colorClassMap.orange,
    icon: '🏦'
  },
  [EntityType.US_DRIVER_LICENSE]: {
    label: 'Driver License',
    color: 'blue',
    className: colorClassMap.blue,
    icon: '🪪'
  },
  [EntityType.US_PASSPORT]: {
    label: 'Passport',
    color: 'purple',
    className: colorClassMap.purple,
    icon: '📘'
  },
  [EntityType.MEDICAL_LICENSE]: {
    label: 'Medical License',
    color: 'green',
    className: colorClassMap.green,
    icon: '🏥'
  },
  [EntityType.UK_NHS]: {
    label: 'UK NHS',
    color: 'blue',
    className: colorClassMap.blue,
    icon: '🏥'
  }
} as const;