import { useSearch } from '@/lib/contexts/search-context';
import { SearchResultsDropdown } from './search-results-dropdown';
import { Search } from 'lucide-react';
import { theme } from '@/config/theme';

export function SearchBar() {
  const { query, setQuery, results, isLoading, error, hasNextPage, loadNextPage, handleSelect } = useSearch();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  return (
    <div className="relative flex-1 max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.text.secondary }} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search repositories..."
          className="w-full h-8 pl-9 pr-3 rounded-md border text-sm"
          style={{
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.primary,
            color: theme.colors.text.primary
          }}
        />
      </div>
      {query && (
        <SearchResultsDropdown
          results={results}
          isLoading={isLoading}
          error={error}
          hasMore={hasNextPage}
          onLoadMore={loadNextPage}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
