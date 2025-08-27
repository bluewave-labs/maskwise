import { Injectable } from '@nestjs/common';
import { Response } from 'express';

// Define interfaces for export functionality
interface SearchResponse {
  findings: SearchFinding[];
  metadata: {
    totalResults: number;
    searchQuery?: string;
    executionTime: number;
    appliedFilters?: {
      entityTypes?: string[];
      confidenceRange?: { min: number; max: number };
      dateRange?: { from: string; to: string };
      projects?: string[];
      datasets?: string[];
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  breakdown: {
    entityType: string;
    count: number;
    avgConfidence: number;
  }[];
}

interface SearchFinding {
  id: string;
  entityType: string;
  maskedText: string;
  context: string;
  confidence: number;
  originalLength: number;
  startPosition: number;
  endPosition: number;
  lineNumber?: number;
  columnNumber?: number;
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

@Injectable()
export class ExportService {
  /**
   * Export search results to CSV format
   */
  async exportToCSV(searchResponse: SearchResponse, res: Response): Promise<void> {
    const { findings, metadata } = searchResponse;
    
    // CSV headers
    const headers = [
      'Entity Type',
      'Masked Text', 
      'Context',
      'Confidence',
      'Dataset Name',
      'Project Name',
      'File Name',
      'Created At',
      'Original Text Length',
      'Start Position',
      'End Position'
    ];
    
    // CSV rows
    const rows = findings.map(finding => [
      finding.entityType,
      finding.maskedText,
      finding.context.replace(/"/g, '""'), // Escape quotes
      Math.round(finding.confidence * 100) + '%',
      finding.dataset.name,
      finding.dataset.project.name,
      finding.dataset.filename,
      new Date(finding.createdAt).toISOString(),
      finding.originalLength,
      finding.startPosition,
      finding.endPosition
    ]);
    
    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Set response headers
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `maskwise-pii-findings-${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));
    
    // Send CSV data
    res.send(csvContent);
  }
  
  /**
   * Export search results to JSON format
   */
  async exportToJSON(searchResponse: SearchResponse, res: Response): Promise<void> {
    const { findings, metadata, pagination, breakdown } = searchResponse;
    
    // Structure data for JSON export
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        total_findings: metadata.totalResults,
        search_query: metadata.searchQuery,
        execution_time_ms: metadata.executionTime,
        applied_filters: {
          entity_types: metadata.appliedFilters?.entityTypes || [],
          confidence_range: metadata.appliedFilters?.confidenceRange || null,
          date_range: metadata.appliedFilters?.dateRange || null,
          projects: metadata.appliedFilters?.projects || [],
          datasets: metadata.appliedFilters?.datasets || []
        }
      },
      
      summary: {
        total_findings: pagination.total,
        pages: pagination.pages,
        current_page: pagination.page,
        findings_per_page: pagination.limit,
        entity_breakdown: breakdown.map(item => ({
          entity_type: item.entityType,
          count: item.count,
          average_confidence: Math.round(item.avgConfidence * 100) / 100,
          percentage: Math.round((item.count / metadata.totalResults) * 100)
        }))
      },
      
      findings: findings.map(finding => ({
        id: finding.id,
        entity_type: finding.entityType,
        masked_text: finding.maskedText,
        context: finding.context,
        confidence: Math.round(finding.confidence * 100) / 100,
        confidence_percentage: Math.round(finding.confidence * 100) + '%',
        
        location: {
          start_position: finding.startPosition,
          end_position: finding.endPosition,
          original_length: finding.originalLength,
          line_number: finding.lineNumber,
          column_number: finding.columnNumber
        },
        
        dataset: {
          id: finding.dataset.id,
          name: finding.dataset.name,
          filename: finding.dataset.filename,
          file_type: finding.dataset.fileType,
          project: {
            id: finding.dataset.project.id,
            name: finding.dataset.project.name
          }
        },
        
        timestamps: {
          created_at: finding.createdAt,
          found_at: finding.createdAt
        }
      }))
    };
    
    // Set response headers
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `maskwise-pii-findings-${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send JSON data with pretty formatting
    const jsonContent = JSON.stringify(exportData, null, 2);
    res.setHeader('Content-Length', Buffer.byteLength(jsonContent));
    res.send(jsonContent);
  }
  
  /**
   * Export search results to Excel format (XLSX)
   */
  async exportToExcel(searchResponse: SearchResponse, res: Response): Promise<void> {
    // For now, we'll redirect to CSV export
    // In the future, this could use a library like 'xlsx' for proper Excel formatting
    return this.exportToCSV(searchResponse, res);
  }
}