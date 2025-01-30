import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearch } from '@/lib/contexts/search-context';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { SearchResultsDropdown } from './search-results-dropdown';
import type { SearchResult } from '@/lib/contexts/search-context';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
}

export const SearchBar = ({ className }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInteractingWithDropdown, setIsInteractingWithDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    results,
    error,
    loading: isLoading,
    recentSearches,
    removeRecentSearch,
    clearRecentSearches,
    hasMore,
    loadMore,
    selectResult,
    selectRecentSearch,
    search,
    clearSearch
  } = useSearch();
  const { selectRepository } = useAnalysis();

  const handleSelect = (result: SearchResult) => {
    selectResult(result);
    selectRepository(result);
    setIsDropdownOpen(false);
    setQuery('');
  };

  const handleSelectRecentSearch = (result: SearchResult) => {
    selectRecentSearch(result);
    selectRepository(result);
    setIsDropdownOpen(false);
    setQuery('');
  };

  const handleBlur = useCallback((event: React.FocusEvent) => {
    // Only close if we're not interacting with the dropdown
    if (!isInteractingWithDropdown) {
      const isWithinContainer = searchContainerRef.current?.contains(event.relatedTarget as Node);
      if (!isWithinContainer) {
        setIsDropdownOpen(false);
        setQuery('');
        clearSearch();
      }
    }
  }, [clearSearch, isInteractingWithDropdown]);

  const handleFocus = useCallback(() => {
    setIsDropdownOpen(true);
  }, []);

  const handleDropdownMouseEnter = useCallback(() => {
    setIsInteractingWithDropdown(true);
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    setIsInteractingWithDropdown(false);
  }, []);

  // Add effect to trigger search when query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        search(query);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, search]);

  return (
    <div
      ref={searchContainerRef}
      className={cn("relative w-full", className)}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search repositories..."
          className="w-full px-4 py-2 text-sm bg-[#0d1117] border rounded-lg border-[#30363d] focus:outline-none focus:ring-2 focus:ring-[#2ea043] text-[#c9d1d9] placeholder-[#8b949e]"
          aria-label="Search repositories"
          spellCheck={false}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#8b949e] border-t-transparent" />
          </div>
        )}
      </div>
      {isDropdownOpen && (
        <div
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        >
          <SearchResultsDropdown
            query={query}
            results={results}
            loading={isLoading}
            error={error}
            recentSearches={recentSearches}
            onSelect={handleSelect}
            onSelectRecentSearch={handleSelectRecentSearch}
            onRemoveRecentSearch={removeRecentSearch}
            onClearRecentSearches={clearRecentSearches}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onTrackRepository={() => { }}
          />
        </div>
      )}
      {isDropdownOpen && query.trim().length > 0 && query.trim().length < 3 && (
        <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg overflow-hidden bg-[#0d1117] border border-[#30363d]">
          <div className="px-3 py-2 text-sm text-[#8b949e]">
            Please enter at least 3 characters to search
          </div>
        </div>
      )}
    </div>
  );
}
