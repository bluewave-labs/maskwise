'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, FileText, Calendar, Zap, Download, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SearchResponse, SearchFinding, EntityTypeConfig } from '@/types/search';
import { EntityTypesPieChart } from '@/components/search/entity-types-pie-chart';
import { 
  DashboardWithRiskAssessment
} from '@/components/search/search-results-layout-options';

interface SearchResultsTableProps {
  results: SearchResponse;
  onPageChange: (page: number) => void;
  onViewDataset: (datasetId: string) => void;
  onExport?: (format: 'csv' | 'json') => void;
  className?: string;
}

export function SearchResultsTable({
  results,
  onPageChange,
  onViewDataset,
  onExport,
  className = ''
}: SearchResultsTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const { findings, metadata, pagination, breakdown } = results;

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const highlightSearchQuery = (text: string, query?: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  if (findings.length === 0) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-[15px] font-medium text-gray-900 mb-2">No PII findings match your search</h3>
            <p className="text-[13px] text-gray-500 mb-4">
              Try adjusting your search query or filters to find more results.
            </p>
            <div className="text-[12px] text-gray-400">
              💡 <strong>Tips:</strong> Search for specific patterns like "email", "phone", or use broader entity type filters
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Dashboard with Risk Assessment */}
      <DashboardWithRiskAssessment
        results={results}
        onPageChange={onPageChange}
        onViewDataset={onViewDataset}
        onExport={onExport}
      />

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px] font-medium text-gray-900">
              PII Findings ({pagination.total.toLocaleString()})
            </CardTitle>
            <div className="text-[12px] text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Entity Type
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Finding
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Context
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Confidence
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Dataset
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Found
                  </th>
                  <th className="text-right py-3 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding) => {
                  const config = EntityTypeConfig[finding.entityType];
                  const isHovered = hoveredRow === finding.id;
                  
                  return (
                    <tr 
                      key={finding.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                        isHovered ? 'bg-gray-50/50' : ''
                      }`}
                      onMouseEnter={() => setHoveredRow(finding.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* Entity Type */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px]">{config.icon}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] h-5 bg-${config.color}-50 text-${config.color}-700 border-${config.color}-200`}
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </td>

                      {/* Masked Text */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-gray-900 bg-gray-50 px-2 py-1 rounded border max-w-[200px] truncate">
                          {highlightSearchQuery(finding.text || finding.maskedText, metadata.searchQuery)}
                        </div>
                      </td>

                      {/* Context */}
                      <td className="py-3 px-4 max-w-[250px]">
                        <div className="text-[11px] text-gray-600 truncate">
                          {highlightSearchQuery(
                            finding.context || 
                            `${finding.contextBefore || ''}...${finding.contextAfter || ''}`.replace(/^\.\.\.|\.\.\.$/g, ''), 
                            metadata.searchQuery
                          )}
                        </div>
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16">
                            <Progress 
                              value={finding.confidence * 100} 
                              className="h-1"
                            />
                          </div>
                          <span className="text-[11px] font-medium text-gray-700">
                            {Math.round(finding.confidence * 100)}%
                          </span>
                        </div>
                      </td>

                      {/* Dataset */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-[11px] font-medium text-gray-900 truncate max-w-[120px]">
                            {finding.dataset.name}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[120px]">
                            {finding.dataset.project.name}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-[11px] text-gray-500">
                            {formatRelativeTime(finding.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDataset(finding.dataset.id)}
                          className="h-7 px-2 text-[11px] hover:bg-gray-100"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <div className="text-[12px] text-gray-500">
                Page {pagination.page} of {pagination.pages} 
                ({pagination.total.toLocaleString()} total results)
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="h-8 px-3 text-[11px]"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(pageNum)}
                        className="h-8 w-8 p-0 text-[11px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="h-8 px-3 text-[11px]"
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}