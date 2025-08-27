'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface GlobalSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onShowFilters: () => void;
  onClear: () => void;
  isLoading: boolean;
  totalFilters: number;
  className?: string;
}

export function GlobalSearchBar({
  query,
  onQueryChange,
  onSearch,
  onShowFilters,
  onClear,
  isLoading,
  totalFilters,
  className = ''
}: GlobalSearchBarProps) {
  const [localQuery, setLocalQuery] = useState(query);

  // Sync local state with prop
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQueryChange(localQuery);
    onSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onQueryChange(localQuery);
      onSearch();
    } else if (e.key === 'Escape') {
      setLocalQuery('');
      onQueryChange('');
      onClear();
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    onQueryChange('');
    onClear();
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for PII (e.g., 'john@example.com', 'credit card', etc.)"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10 h-10 text-[13px] border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          {localQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="h-10 px-6 text-[13px] bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Spinner className="h-3 w-3 mr-2" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>

        {/* Filters Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onShowFilters}
          className="h-10 px-4 text-[13px] border-gray-200 hover:bg-gray-50 relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {totalFilters > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-white"
            >
              {totalFilters}
            </Badge>
          )}
        </Button>
      </form>

      {/* Search Tips */}
      {!query && !isLoading && (
        <div className="mt-3 text-[11px] text-gray-500">
          💡 <strong>Tips:</strong> Search for specific PII (emails, SSNs), or use filters to narrow results by entity type and confidence
        </div>
      )}
    </div>
  );
}