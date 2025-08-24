'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DateRangeSelectorProps {
  selectedRange: '7d' | '30d' | '90d' | 'all';
  onRangeChange: (range: '7d' | '30d' | '90d' | 'all') => void;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

const rangeOptions = [
  { value: '7d' as const, label: 'Last 7 days' },
  { value: '30d' as const, label: 'Last 30 days' },
  { value: '90d' as const, label: 'Last 90 days' },
  { value: 'all' as const, label: 'All time' },
];

export function DateRangeSelector({ selectedRange, onRangeChange, dateRange }: DateRangeSelectorProps) {
  const formatDateRange = () => {
    if (!dateRange) return '';
    
    const start = dateRange.startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateRange.startDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    
    const end = dateRange.endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateRange.endDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    
    return `${start} - ${end}`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Date Range:</span>
            {dateRange && (
              <span className="text-sm text-muted-foreground">
                {formatDateRange()}
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            {rangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedRange === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onRangeChange(option.value)}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}