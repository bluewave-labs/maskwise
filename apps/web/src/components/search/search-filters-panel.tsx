'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EntityType, EntityTypeConfig, SearchParams } from '@/types/search';

interface SearchFiltersPanelProps {
  searchParams: SearchParams;
  onUpdateParams: (updates: Partial<SearchParams>) => void;
  onClose: () => void;
  onApplyFilters: () => void;
  onClearAll: () => void;
}

export function SearchFiltersPanel({
  searchParams,
  onUpdateParams,
  onClose,
  onApplyFilters,
  onClearAll
}: SearchFiltersPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    entityTypes: true,
    confidence: true,
    dateRange: false,
    projects: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEntityTypeToggle = (entityType: EntityType) => {
    const currentTypes = searchParams.entityTypes || [];
    const isSelected = currentTypes.includes(entityType);
    
    const newTypes = isSelected
      ? currentTypes.filter(type => type !== entityType)
      : [...currentTypes, entityType];
    
    onUpdateParams({ entityTypes: newTypes.length > 0 ? newTypes : undefined });
  };

  const handleConfidenceChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const updates: Partial<SearchParams> = {};
    if (type === 'min') {
      updates.minConfidence = numValue === 0 ? undefined : numValue;
    } else {
      updates.maxConfidence = numValue === 1 ? undefined : numValue;
    }
    onUpdateParams(updates);
  };

  const hasAnyFilters = !!(
    searchParams.query ||
    searchParams.entityTypes?.length ||
    searchParams.minConfidence !== undefined ||
    searchParams.maxConfidence !== undefined ||
    searchParams.dateFrom ||
    searchParams.dateTo
  );

  // Group entity types by category for better organization
  const commonEntityTypes = [
    EntityType.EMAIL_ADDRESS,
    EntityType.PHONE_NUMBER,
    EntityType.CREDIT_CARD,
    EntityType.SSN,
    EntityType.PERSON
  ];

  const advancedEntityTypes = [
    EntityType.DATE_TIME,
    EntityType.URL,
    EntityType.LOCATION,
    EntityType.ORGANIZATION,
    EntityType.IP_ADDRESS,
    EntityType.IBAN,
    EntityType.US_DRIVER_LICENSE,
    EntityType.US_PASSPORT,
    EntityType.MEDICAL_LICENSE,
    EntityType.UK_NHS
  ];

  return (
    <Card className="w-full max-w-md bg-white shadow-lg border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[15px] font-medium text-gray-900">Search Filters</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Entity Types Section */}
        <div>
          <button
            onClick={() => toggleSection('entityTypes')}
            className="flex items-center justify-between w-full text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span>Entity Types</span>
            {expandedSections.entityTypes ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.entityTypes && (
            <div className="mt-3 space-y-3">
              {/* Common Types */}
              <div>
                <div className="text-[11px] text-gray-500 mb-2">Common</div>
                <div className="grid grid-cols-1 gap-2">
                  {commonEntityTypes.map(entityType => {
                    const config = EntityTypeConfig[entityType];
                    const isSelected = searchParams.entityTypes?.includes(entityType) || false;
                    
                    return (
                      <label
                        key={entityType}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleEntityTypeToggle(entityType)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-[13px]">{config.icon}</span>
                        <span className="text-[12px] text-gray-700">{config.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Types */}
              <div>
                <div className="text-[11px] text-gray-500 mb-2">Advanced</div>
                <div className="grid grid-cols-2 gap-1">
                  {advancedEntityTypes.map(entityType => {
                    const config = EntityTypeConfig[entityType];
                    const isSelected = searchParams.entityTypes?.includes(entityType) || false;
                    
                    return (
                      <label
                        key={entityType}
                        className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 p-1 rounded text-[11px]"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleEntityTypeToggle(entityType)}
                          className="rounded border-gray-300 text-primary focus:ring-primary scale-75"
                        />
                        <span className="text-[11px]">{config.icon}</span>
                        <span className="text-[10px] text-gray-600">{config.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confidence Range Section */}
        <div>
          <button
            onClick={() => toggleSection('confidence')}
            className="flex items-center justify-between w-full text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span>Confidence Range</span>
            {expandedSections.confidence ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.confidence && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Minimum</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={searchParams.minConfidence ?? 0}
                    onChange={(e) => handleConfidenceChange('min', e.target.value)}
                    className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Maximum</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={searchParams.maxConfidence ?? 1}
                    onChange={(e) => handleConfidenceChange('max', e.target.value)}
                    className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              
              {/* Confidence Presets */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateParams({ minConfidence: 0.9, maxConfidence: undefined })}
                  className="text-[11px] h-7 px-3"
                >
                  High (90%+)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateParams({ minConfidence: 0.7, maxConfidence: 0.9 })}
                  className="text-[11px] h-7 px-3"
                >
                  Medium (70-90%)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateParams({ minConfidence: undefined, maxConfidence: 0.7 })}
                  className="text-[11px] h-7 px-3"
                >
                  Low (&lt;70%)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Date Range Section */}
        <div>
          <button
            onClick={() => toggleSection('dateRange')}
            className="flex items-center justify-between w-full text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span>Date Range</span>
            {expandedSections.dateRange ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.dateRange && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={searchParams.dateFrom || ''}
                    onChange={(e) => onUpdateParams({ dateFrom: e.target.value || undefined })}
                    className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={searchParams.dateTo || ''}
                    onChange={(e) => onUpdateParams({ dateTo: e.target.value || undefined })}
                    className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              
              {/* Date Presets */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    onUpdateParams({ 
                      dateFrom: lastWeek.toISOString().split('T')[0],
                      dateTo: today.toISOString().split('T')[0]
                    });
                  }}
                  className="text-[11px] h-7 px-3"
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    onUpdateParams({ 
                      dateFrom: lastMonth.toISOString().split('T')[0],
                      dateTo: today.toISOString().split('T')[0]
                    });
                  }}
                  className="text-[11px] h-7 px-3"
                >
                  Last 30 days
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            onClick={onApplyFilters}
            className="flex-1 h-9 text-[13px] bg-primary hover:bg-primary/90"
          >
            Apply Filters
          </Button>
          {hasAnyFilters && (
            <Button
              variant="outline"
              onClick={onClearAll}
              className="px-4 h-9 text-[13px] border-gray-200 hover:bg-gray-50"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Filter Summary */}
        {hasAnyFilters && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-[11px] text-gray-500 mb-2">Active Filters:</div>
            <div className="flex flex-wrap gap-1">
              {searchParams.query && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  Query: "{searchParams.query}"
                </Badge>
              )}
              {searchParams.entityTypes?.length && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {searchParams.entityTypes.length} entity types
                </Badge>
              )}
              {(searchParams.minConfidence !== undefined || searchParams.maxConfidence !== undefined) && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  Confidence range
                </Badge>
              )}
              {(searchParams.dateFrom || searchParams.dateTo) && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  Date range
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}