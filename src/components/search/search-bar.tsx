import { useEffect, useRef, useCallback, useState } from 'react';
import { Search, Star, Clock, X } from 'lucide-react';
import { useSearch } from '@/lib/contexts/search-context';
import { theme } from '@/config/theme';

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
  console.log('Grouped results:', {
    owned: groupedResults['owned']?.length || 0,
    favorited: groupedResults['favorited']?.length || 0,
    other: groupedResults['other']?.length || 0
  });

  const renderRepository = (repo: SearchResult) => (
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
          <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
            {repo.owner.login}/{repo.name}
          </span>
          {repo.description && (
            <span className="text-xs line-clamp-2" style={{ color: theme.colors.text.secondary }}>
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
        color: theme.colors.text.secondary,
        borderBottom: `1px solid ${theme.colors.border.primary}`
      }}
    >
      {title}
    </div>
  );

  const renderSeparator = (isNewAPIBatch = false) => (
    <div
      className={`h-px my-2 ${isNewAPIBatch ? 'opacity-40' : 'opacity-20'}`}
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
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb hover:scrollbar-thumb-scrollbar-hover">
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
              className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb hover:scrollbar-thumb-scrollbar-hover"
            >
              {/* Exact Matches */}
              {groupedResults['exact']?.length > 0 && (
                <div>
                  {renderCategoryHeader('Exact Match')}
                  {groupedResults['exact'].map(repo => (
                    <div key={repo.id}>
                      {renderRepository(repo)}
                    </div>
                  ))}
                  {(groupedResults['owned']?.length > 0 || groupedResults['favorited']?.length > 0 || groupedResults['other']?.length > 0) && renderSeparator()}
                </div>
              )}

              {/* Owned Repositories */}
              {groupedResults['owned']?.length > 0 && (
                <div>
                  {renderCategoryHeader('Owned')}
                  {groupedResults['owned'].map(repo => (
                    <div key={repo.id}>
                      {renderRepository(repo)}
                    </div>
                  ))}
                  {(groupedResults['favorited']?.length > 0 || groupedResults['other']?.length > 0) && renderSeparator()}
                </div>
              )}

              {/* Favorited Repositories */}
              {groupedResults['favorited']?.length > 0 && (
                <div>
                  {renderCategoryHeader('Favorited')}
                  {groupedResults['favorited'].map(repo => (
                    <div key={repo.id}>
                      {renderRepository(repo)}
                    </div>
                  ))}
                  {groupedResults['other']?.length > 0 && renderSeparator()}
                </div>
              )}

              {/* Other Repositories */}
              {groupedResults['other']?.length > 0 && (
                <div>
                  {groupedResults['exact']?.length === 0 && groupedResults['owned']?.length === 0 && groupedResults['favorited']?.length === 0 && renderCategoryHeader('All Results')}
                  {groupedResults['other'].map((repo, index) => {
                    const isLastInAPIBatch = (index + 1) % RESULTS_PER_API_CALL === 0;
                    const isNewAPIBatch = isLastInAPIBatch && index + 1 < groupedResults['other'].length;
                    return (
                      <div key={repo.id}>
                        {renderRepository(repo)}
                        {isNewAPIBatch && renderSeparator(true)}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Infinite scroll observer */}
              {hasNextPage && (
                <div
                  ref={observerRef}
                  className="p-4 text-center text-sm"
                  style={{ color: theme.colors.text.secondary }}
                >
                  {loading ? 'Loading more...' : 'Scroll to load more results'}
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
