import { useEffect, useRef, useCallback, useState } from 'react';
import { Search, Star, Clock, X } from 'lucide-react';
import { useSearch } from '@/lib/contexts/search-context';
import { theme } from '@/config/theme';

interface SearchResult {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  private: boolean;
  stargazers_count: number;
  category?: 'exact' | 'owned' | 'favorited' | null;
}

const RESULTS_PER_PAGE = 10; // Match the context's RESULTS_PER_PAGE
const RESULTS_PER_API_CALL = 30; // Number of results per API call

export function SearchBar() {
  const {
    query,
    setQuery,
    results,
    loading,
    hasNextPage,
    fetchNextPage,
    handleRepositorySelect,
    recentSearches,
    clearRecentSearches
  } = useSearch();
  const searchRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setQuery(''); // Clear query to hide results
        setIsFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setQuery]);

  // Infinite scroll handler
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasNextPage && !loading) {
      fetchNextPage();
    }
  }, [hasNextPage, loading, fetchNextPage]);

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    });

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [handleObserver]);

  // Group results by category and then into batches
  const groupedResults = results.reduce((acc, result) => {
    const category = result.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  // Debug log the grouped results
  console.log('Search Bar - Results:', results);
  console.log('Search Bar - Grouped Results:', {
    exact: groupedResults['exact']?.length || 0,
    owned: groupedResults['owned']?.length || 0,
    favorited: groupedResults['favorited']?.length || 0,
    other: groupedResults['other']?.length || 0,
    categories: results.map(r => ({ repo: `${r.owner.login}/${r.name}`, category: r.category }))
  });

  const renderRepository = (repo: SearchResult, index: number) => (
    <div
      key={repo.id}
      onClick={() => {
        handleRepositorySelect(repo.owner.login, repo.name, 'analyze');
        setQuery('');
      }}
      className="flex flex-col gap-1 p-3 cursor-pointer transition-colors hover:bg-gray-500/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center">
            <div
              className="w-8 flex items-center justify-center mr-2 text-sm"
              style={{ color: theme.colors.text.secondary }}
            >
              {String(index).padStart(2, '0')}
            </div>
            <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              {repo.owner.login}/{repo.name}
            </span>
          </div>
          {repo.description && (
            <span className="text-xs line-clamp-2 ml-10" style={{ color: theme.colors.text.secondary }}>
              {repo.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
          <Star className="h-4 w-4" />
          <span className="text-xs">{repo.stargazers_count.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  const renderCategoryHeader = (title: string) => (
    <div
      className="sticky top-0 px-3 py-2 text-xs font-medium bg-opacity-90 backdrop-blur-sm"
      style={{
        backgroundColor: theme.colors.background.secondary,
        color: theme.colors.text.secondary
      }}
    >
      {title}
    </div>
  );

  const renderSeparator = (isNewAPIBatch = false) => (
    <div
      className={`h-px my-2 opacity-40`}
      style={{
        backgroundColor: theme.colors.border.primary,
      }}
    >
      {isNewAPIBatch && (
        <div className="flex items-center justify-center -mt-2.5">
          <span
            className="px-2 text-xs rounded"
            style={{
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.secondary
            }}
          >
            More results
          </span>
        </div>
      )}
    </div>
  );

  const SearchResults = () => {
    const { results, loading, hasNextPage, fetchNextPage } = useSearch();
    const [displayedResults, setDisplayedResults] = useState<number>(RESULTS_PER_PAGE);
    const hasMoreResults = displayedResults < results.length;
    const isEndOfResults = results.length === RESULTS_PER_API_CALL;

    const handleLoadMore = () => {
      setDisplayedResults(prev => Math.min(prev + RESULTS_PER_PAGE, results.length));
    };

    // Group results by category
    const groupedResults = results.slice(0, displayedResults).reduce((acc, result) => {
      const category = result.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    }, {} as Record<string, Repository[]>);

    const renderSeparator = () => (
      <div
        className="h-px my-2 opacity-40"
        style={{ backgroundColor: theme.colors.border.primary }}
      />
    );

    const renderLoadMore = () => (
      <div className="flex justify-center py-2">
        <button
          onClick={handleLoadMore}
          className="text-sm text-muted hover:text-primary transition-colors"
        >
          Load More
        </button>
      </div>
    );

    const renderEndOfResults = () => (
      <div className="text-center py-2 text-sm text-muted">
        End of search results
      </div>
    );

    if (loading) {
      return <div className="p-4 text-center">Loading...</div>;
    }

    if (!results.length) {
      return <div className="p-4 text-center">No results found</div>;
    }

    return (
      <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-neutral-900 scrollbar-thumb-neutral-700 hover:scrollbar-thumb-neutral-600">
        {/* Owned Repositories */}
        {groupedResults.owned?.length > 0 && (
          <>
            <div className="px-3 py-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Your Repositories
            </div>
            {groupedResults.owned.map((result, index) => renderRepository(result, index + 1))}
            {renderSeparator()}
          </>
        )}

        {/* Other Results */}
        {groupedResults.other?.length > 0 && (
          <>
            <div className="px-3 py-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              {groupedResults.owned?.length ? 'Search Results' : 'All Results'}
            </div>
            {groupedResults.other.map((result, index) =>
              renderRepository(result, (groupedResults.owned?.length || 0) + index + 1)
            )}
          </>
        )}

        {/* Load More or End of Results */}
        {hasMoreResults && renderLoadMore()}
        {isEndOfResults && !hasMoreResults && renderEndOfResults()}
      </div>
    );
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.text.secondary }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search repositories..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border"
          style={{
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.primary,
          }}
        />
      </div>

      {/* Results dropdown */}
      {(query.length > 0 || isFocused) && (
        <div
          className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-lg border shadow-md"
          style={{
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.primary,
          }}
        >
          {query.length === 0 && recentSearches.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-background-primary scrollbar-thumb-border-primary hover:scrollbar-thumb-muted">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium" style={{ color: theme.colors.text.secondary }}>
                  Recent Searches
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecentSearches();
                  }}
                  className="text-xs hover:underline"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((search) => (
                <div
                  key={search.timestamp}
                  onClick={() => setQuery(search.query)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-500/5"
                >
                  <Clock className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
                  <span className="text-sm flex-1" style={{ color: theme.colors.text.primary }}>
                    {search.query}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecentSearches(prev => prev.filter(s => s.timestamp !== search.timestamp));
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : loading && results.length === 0 ? (
            <div className="p-4 text-sm" style={{ color: theme.colors.text.secondary }}>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div
              className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-neutral-900 scrollbar-thumb-neutral-700 hover:scrollbar-thumb-neutral-600"
            >
              {/* Owned Repositories */}
              {groupedResults['owned']?.length > 0 && (
                <>
                  <div className="px-3 py-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
                    Your Repositories
                  </div>
                  {groupedResults['owned'].map((result, index) => renderRepository(result, index + 1))}
                  {renderSeparator()}
                </>
              )}

              {/* Other Results */}
              {groupedResults['other']?.length > 0 && (
                <>
                  <div className="px-3 py-2 text-sm font-medium" style={{ color: theme.colors.text.primary }}>
                    {groupedResults['owned']?.length ? 'Search Results' : 'All Results'}
                  </div>
                  {groupedResults['other'].map((result, index) =>
                    renderRepository(result, (groupedResults['owned']?.length || 0) + index + 1)
                  )}
                </>
              )}

              {/* Load More Indicator */}
              {hasNextPage && (
                <div ref={observerRef} className="h-8 flex items-center justify-center">
                  {loading ? (
                    <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                      Loading more...
                    </span>
                  ) : (
                    renderSeparator(true)
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-sm" style={{ color: theme.colors.text.secondary }}>
              No repositories found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
