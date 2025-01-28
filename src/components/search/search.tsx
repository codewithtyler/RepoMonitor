import { useEffect, useState } from 'react';
import { useSearch } from '@/lib/contexts/search-context';
import { SearchResultsDropdown } from './search-results-dropdown';
import type { SearchResult } from '@/lib/contexts/search-context';
import { theme } from '@/config/theme';

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
        addToRecentSearches,
        clearSearch
    } = useSearch();

    const [showDropdown, setShowDropdown] = useState(false);

    // Effect to perform search when query changes
    useEffect(() => {
        if (query.trim()) {
            search(query);
        } else {
            clearSearch();
        }
    }, [query, search, clearSearch]);

    const handleSelect = (result: SearchResult) => {
        addToRecentSearches(result);
        setShowDropdown(false);
        // Additional navigation logic here if needed
    };

    const handleSelectRecentSearch = (result: SearchResult) => {
        setQuery(result.owner + '/' + result.name);
        handleSelect(result);
    };

    const handleRemoveRecentSearch = (id: number) => {
        removeRecentSearch(id);
    };

    const handleClearRecentSearches = () => {
        clearRecentSearches();
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search repositories..."
                className="w-full px-3 py-2 rounded-md"
                style={{
                    backgroundColor: theme.colors.background.secondary,
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.border.primary
                }}
            />

            {showDropdown && (
                <SearchResultsDropdown
                    query={query}
                    results={results}
                    loading={loading}
                    error={error}
                    recentSearches={recentSearches}
                    onSelect={handleSelect}
                    onSelectRecentSearch={handleSelectRecentSearch}
                    onRemoveRecentSearch={handleRemoveRecentSearch}
                    onClearRecentSearches={handleClearRecentSearches}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                />
            )}
        </div>
    );
}
