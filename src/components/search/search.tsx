import React, { useEffect, useState } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { SearchResultsDropdown } from './SearchResultsDropdown';

export function Search() {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    recentSearches,
    removeRecentSearch,
    clearRecentSearches,
    search,
    hasMore,
    loadMore,
    addToRecentSearches
  } = useSearch();

  const [showDropdown, setShowDropdown] = useState(false);

  const handleSelect = (selected: string) => {
    // Handle selection
  };

  const handleSelectRecentSearch = (selected: string) => {
    // Handle selection from recent searches
  };

  return (
    <div className="relative w-full">
      {/* ... existing input code ... */}

      {showDropdown && (
        <SearchResultsDropdown
          query={query}
          results={results}
          loading={loading}
          error={error}
          recentSearches={recentSearches}
          onSelect={handleSelect}
          onSelectRecentSearch={handleSelectRecentSearch}
          onRemoveRecentSearch={removeRecentSearch}
          onClearRecentSearches={clearRecentSearches}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}
