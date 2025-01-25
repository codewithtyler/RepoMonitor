import { useRef, useState, useEffect } from 'react';
import { useSearch } from '@/lib/contexts/search-context';
import { SearchResultsDropdown } from './search-results-dropdown';
import { theme } from '@/config/theme';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
}

export function SearchBar({ placeholder = 'Search repositories...', value = '', onChange, autoFocus = false }: SearchBarProps) {
  const { results, loading, error, recentSearches, removeRecentSearch, search } = useSearch();
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        dropdownRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange?.(newValue);
    setShowDropdown(true);
    if (newValue.length >= 3) {
      search(newValue);
    }
  };

  const handleClearSearch = () => {
    onChange?.('');
    setShowDropdown(false);
  };

  const handleSelect = (repository: { owner: string; name: string }) => {
    onChange?.(repository.owner + '/' + repository.name);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand-primary"
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary,
          color: theme.colors.text.primary,
          caretColor: theme.colors.text.primary,
        }}
      />
      {value && (
        <button
          onClick={handleClearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-75 transition-opacity"
          style={{ color: theme.colors.text.secondary }}
        >
          ×
        </button>
      )}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 z-10 rounded-lg border shadow-lg"
          style={{
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.primary
          }}
        >
          <SearchResultsDropdown
            query={value}
            results={results}
            loading={loading}
            error={error}
            recentSearches={recentSearches}
            onSelect={handleSelect}
            onRemoveRecentSearch={removeRecentSearch}
          />
        </div>
      )}
    </div>
  );
}
