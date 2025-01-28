import { useEffect, useRef, useState } from 'react';
import { useSearch, type SearchResult } from '@/lib/contexts/search-context';
import { useRepositorySelection } from '@/lib/hooks/use-repository-selection';
import { SearchResultsDropdown } from './search-results-dropdown';
import { theme } from '@/config/theme';

interface Props {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export function SearchBar({ placeholder = 'Search...', value, onChange, autoFocus }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { handleRepositorySelect } = useRepositorySelection();
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    recentSearches,
    search,
    hasMore,
    loadMore,
    addToRecentSearches,
    clearSearch
  } = useSearch();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        clearSearch();
        onChange('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSearch, onChange]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    setQuery(newValue);

    if (newValue.length >= 3) {
      search(newValue);
      setShowDropdown(true);
    } else {
      setShowDropdown(newValue.length > 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && query.length >= 3) {
      search(query);
      setShowDropdown(true);
    }
  };

  const handleSelect = (result: SearchResult) => {
    onChange(`${result.owner}/${result.name}`);
    setShowDropdown(false);
    addToRecentSearches(result);
    clearSearch();
    handleRepositorySelect(result);
  };

  const handleSelectRecentSearch = (result: SearchResult) => {
    onChange(`${result.owner}/${result.name}`);
    setQuery(`${result.owner}/${result.name}`);
    setShowDropdown(false);
    search(`${result.owner}/${result.name}`);
    handleRepositorySelect(result);
  };

  const handleFocus = () => {
    if (value || (recentSearches && recentSearches.length > 0)) {
      setShowDropdown(true);
    }
    if (!value) {
      clearSearch();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2"
          style={{
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.primary,
            color: theme.colors.text.primary,
          }}
        />
      </div>
      {showDropdown && (
        <SearchResultsDropdown
          query={query}
          results={results}
          loading={loading}
          error={error}
          recentSearches={recentSearches}
          onSelect={handleSelect}
          onSelectRecentSearch={handleSelectRecentSearch}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}
