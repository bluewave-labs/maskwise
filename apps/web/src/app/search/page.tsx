'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Search, TrendingUp } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { GlobalSearchBar } from '@/components/search/global-search-bar';
import { SearchFiltersPanel } from '@/components/search/search-filters-panel';
import { SearchResultsTable } from '@/components/search/search-results-table';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

export default function SearchPage() {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const {
    searchParams,
    updateSearchParams,
    resetSearch,
    results,
    isLoading,
    error,
    executeSearch,
    exportResults,
    hasFilters,
    totalFiltersApplied
  } = useGlobalSearch();

  // Handle search execution
  const handleSearch = async () => {
    setHasSearched(true);
    await executeSearch();
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    updateSearchParams({ page });
    executeSearch();
  };

  // Handle view dataset
  const handleViewDataset = (datasetId: string) => {
    router.push(`/datasets/${datasetId}`);
  };

  // Handle clear all
  const handleClearAll = () => {
    resetSearch();
    setHasSearched(false);
    setShowFilters(false);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        pageTitle="Global PII Search"
        pageDescription="Search across all your datasets to find specific PII, analyze patterns, and ensure compliance"
      >
        <div className="max-w-7xl">
          {/* Search Interface */}
          <div className="relative mb-8">
            <div className="flex items-start gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <GlobalSearchBar
                  query={searchParams.query || ''}
                  onQueryChange={(query) => updateSearchParams({ query })}
                  onSearch={handleSearch}
                  onShowFilters={() => setShowFilters(!showFilters)}
                  onClear={handleClearAll}
                  isLoading={isLoading}
                  totalFilters={totalFiltersApplied}
                />
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="absolute top-12 right-0 z-10">
                  <SearchFiltersPanel
                    searchParams={searchParams}
                    onUpdateParams={updateSearchParams}
                    onClose={() => setShowFilters(false)}
                    onApplyFilters={() => {
                      handleSearch();
                      setShowFilters(false);
                    }}
                    onClearAll={handleClearAll}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[13px]">
                <span className="font-medium">Search failed:</span> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Content Area */}
          <div className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-3 text-[14px] text-gray-600">
                      <div className="animate-spin rounded-full border-2 border-primary border-t-transparent h-5 w-5"></div>
                      Searching across your datasets...
                    </div>
                    <div className="text-[12px] text-gray-500 mt-2">
                      This may take a few seconds for large datasets
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Results */}
            {!isLoading && results && (
              <SearchResultsTable
                results={results}
                onPageChange={handlePageChange}
                onViewDataset={handleViewDataset}
                onExport={exportResults}
              />
            )}

            {/* Welcome State - Show when no search has been performed */}
            {!isLoading && !results && !hasSearched && (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center max-w-2xl mx-auto">
                    <div className="text-6xl mb-6">🔍</div>
                    <h2 className="text-[18px] font-medium text-gray-900 mb-4">
                      Search for PII Across All Your Datasets
                    </h2>
                    <p className="text-[14px] text-gray-600 mb-8 leading-relaxed">
                      Use the search bar above to find specific PII like email addresses, SSNs, or credit cards. 
                      Apply filters to narrow down results by entity type, confidence level, or date range.
                    </p>
                    
                    {/* Search Examples */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-[13px] font-medium text-blue-900 mb-2">Search by Content</div>
                        <div className="text-[12px] text-blue-700 font-mono bg-blue-100 px-2 py-1 rounded">
                          "john@example.com"
                        </div>
                        <div className="text-[11px] text-blue-600 mt-1">Find specific email patterns</div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-[13px] font-medium text-green-900 mb-2">Filter by Type</div>
                        <div className="text-[12px] text-green-700 font-mono bg-green-100 px-2 py-1 rounded">
                          Entity: Credit Card
                        </div>
                        <div className="text-[11px] text-green-600 mt-1">Find all payment data</div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="text-[13px] font-medium text-purple-900 mb-2">High Confidence</div>
                        <div className="text-[12px] text-purple-700 font-mono bg-purple-100 px-2 py-1 rounded">
                          Confidence: 90%+
                        </div>
                        <div className="text-[11px] text-purple-600 mt-1">Find high-quality matches</div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center justify-center gap-6 text-[12px] text-gray-500 border-t border-gray-100 pt-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>15+ Entity Types Supported</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span>Real-time Search Results</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Results State */}
            {!isLoading && results && results.findings.length === 0 && hasSearched && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-[16px] font-medium text-gray-900 mb-2">No PII findings match your search</h3>
                    <p className="text-[13px] text-gray-500 mb-6">
                      Try adjusting your search query or removing some filters to see more results.
                    </p>
                    
                    {/* Search Suggestions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left">
                        <div className="text-[12px] font-medium text-gray-900 mb-1">Try broader terms:</div>
                        <div className="text-[11px] text-gray-600">"email", "phone", "payment"</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left">
                        <div className="text-[12px] font-medium text-gray-900 mb-1">Remove filters:</div>
                        <div className="text-[11px] text-gray-600">Clear entity types or date range</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}