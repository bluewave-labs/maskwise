'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TopStatsWithSideChart, 
  FullWidthStatsWithBarChart, 
  CardGridLayout, 
  SidebarWithEntityDetails 
} from './search-results-layout-options';

// Mock data for demonstration
const mockResults = {
  findings: [],
  metadata: {
    totalResults: 1247,
    executionTime: 142,
    searchQuery: "email"
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 1247,
    pages: 63,
    hasNext: true,
    hasPrev: false
  },
  breakdown: [
    { entityType: 'EMAIL_ADDRESS', count: 456, avgConfidence: 0.95 },
    { entityType: 'PHONE_NUMBER', count: 234, avgConfidence: 0.87 },
    { entityType: 'CREDIT_CARD', count: 189, avgConfidence: 0.92 },
    { entityType: 'PERSON', count: 156, avgConfidence: 0.83 },
    { entityType: 'SSN', count: 112, avgConfidence: 0.96 },
    { entityType: 'URL', count: 100, avgConfidence: 0.78 }
  ]
};

const layoutOptions = [
  {
    id: 'current',
    name: 'Top Stats + Side Pie Chart',
    description: 'Current layout with summary stats and pie chart on the right',
    component: TopStatsWithSideChart
  },
  {
    id: 'fullwidth',
    name: 'Full Width + Bar Chart',
    description: 'Full-width stats bar with horizontal bar chart below',
    component: FullWidthStatsWithBarChart
  },
  {
    id: 'cardgrid',
    name: 'Card Grid Layout',
    description: 'Stats in individual cards with entity type grid',
    component: CardGridLayout
  },
  {
    id: 'sidebar',
    name: 'Sidebar with Details',
    description: 'Main content with expandable entity sidebar',
    component: SidebarWithEntityDetails
  }
];

export function LayoutShowcase() {
  const [selectedLayout, setSelectedLayout] = useState('current');

  const SelectedComponent = layoutOptions.find(opt => opt.id === selectedLayout)?.component || TopStatsWithSideChart;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Layout Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Search Results Layout Options</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Choose from different UI designs for displaying search results and entity types
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {layoutOptions.map(option => (
              <div key={option.id}>
                <Button
                  variant={selectedLayout === option.id ? 'default' : 'outline'}
                  className="w-full h-auto p-4 flex flex-col items-start"
                  onClick={() => setSelectedLayout(option.id)}
                >
                  <div className="font-medium text-[14px] mb-2">{option.name}</div>
                  <div className="text-[11px] text-left opacity-80 leading-relaxed">
                    {option.description}
                  </div>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Layout Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {layoutOptions.find(opt => opt.id === selectedLayout)?.name}
            </CardTitle>
            <Badge variant="secondary">
              Preview Mode
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <SelectedComponent
              results={mockResults}
              onPageChange={() => {}}
              onViewDataset={() => {}}
              onExport={() => {}}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {layoutOptions.map(option => (
          <Card key={option.id} className={selectedLayout === option.id ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-medium flex items-center justify-between">
                {option.name}
                {selectedLayout === option.id && <Badge>Currently Selected</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] text-muted-foreground mb-3">{option.description}</p>
              
              <div className="space-y-2">
                {option.id === 'current' && (
                  <div className="text-[12px] text-gray-600">
                    <strong>Features:</strong> Compact pie chart, stats cards, space-efficient
                  </div>
                )}
                {option.id === 'fullwidth' && (
                  <div className="text-[12px] text-gray-600">
                    <strong>Features:</strong> Horizontal bars, extended stats, visual progression
                  </div>
                )}
                {option.id === 'cardgrid' && (
                  <div className="text-[12px] text-gray-600">
                    <strong>Features:</strong> Card-based design, grid layout, individual entity cards
                  </div>
                )}
                {option.id === 'sidebar' && (
                  <div className="text-[12px] text-gray-600">
                    <strong>Features:</strong> Interactive sidebar, expandable details, filtering capability
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}