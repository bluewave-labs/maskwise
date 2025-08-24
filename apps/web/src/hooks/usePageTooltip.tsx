'use client';

import { usePathname } from 'next/navigation';

interface TooltipContent {
  title: string;
  description: string;
  features: string[];
}

const TOOLTIP_CONTENT: Record<string, TooltipContent> = {
  '/dashboard': {
    title: 'Dashboard Overview',
    description: 'Monitor your PII detection activities and system performance metrics in real-time.',
    features: [
      'View recent scan statistics and processing status',
      'Monitor dataset processing progress',
      'Track PII findings across all projects',
      'Access quick actions for common workflows'
    ]
  },
  '/projects': {
    title: 'Project Management',
    description: 'Organize your datasets and workflows into structured projects for better management.',
    features: [
      'Create and manage data projects',
      'Group related datasets together',
      'Track project-level statistics',
      'Configure project-specific settings'
    ]
  },
  '/datasets': {
    title: 'Dataset Management',
    description: 'Upload, manage, and analyze your data files for PII detection and anonymization.',
    features: [
      'Upload files for PII analysis',
      'Track processing status in real-time',
      'View detailed PII findings and results',
      'Manage file metadata and organization'
    ]
  },
  '/jobs': {
    title: 'Job Processing',
    description: 'Monitor and manage background processing jobs for PII detection and anonymization.',
    features: [
      'Track job processing status and progress',
      'View job history and completion details',
      'Monitor queue status and performance',
      'Retry failed jobs and troubleshoot issues'
    ]
  },
  '/anonymize': {
    title: 'Anonymization Workflow',
    description: 'Interactive workflow for anonymizing detected PII data with customizable policies.',
    features: [
      'Apply anonymization policies to datasets',
      'Preview anonymization results before applying',
      'Configure masking and replacement strategies',
      'Generate anonymized output files'
    ]
  },
  '/policies': {
    title: 'Privacy Policies',
    description: 'Create and manage YAML-based privacy policies that define PII detection and anonymization rules.',
    features: [
      'Create custom PII detection policies',
      'Configure entity types and confidence thresholds',
      'Define anonymization actions and rules',
      'Use pre-built compliance templates (GDPR, HIPAA, Finance)'
    ]
  },
  '/reports': {
    title: 'Analytics & Reports',
    description: 'Generate comprehensive reports and analytics on PII findings and compliance activities.',
    features: [
      'View detailed PII detection analytics',
      'Generate compliance reports and summaries',
      'Export findings data in multiple formats',
      'Track trends and patterns over time'
    ]
  },
  '/settings': {
    title: 'System Settings',
    description: 'Configure system preferences, manage users, and customize platform settings.',
    features: [
      'Manage user accounts and permissions',
      'Configure API keys and integrations',
      'Set system-wide preferences',
      'Access audit logs and system health'
    ]
  }
};

export function usePageTooltip() {
  const pathname = usePathname();
  
  // Find matching tooltip content for current path
  const tooltipContent = TOOLTIP_CONTENT[pathname];
  
  return {
    hasTooltip: !!tooltipContent,
    tooltipContent
  };
}