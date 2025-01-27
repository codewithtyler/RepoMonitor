import { useEffect, useState, useRef, useCallback } from 'react';
import { getAuthState } from '@/lib/auth/global-state';
import { theme } from '@/config/theme';
import type { SearchResult } from '@/lib/contexts/search-context';
import { CustomScrollbar } from '@/components/common/custom-scrollbar';

interface Props {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  recentSearches: SearchResult[];
  onSelect: (result: SearchResult) => void;
  onSelectRecentSearch: (result: SearchResult) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function SearchResultsDropdown({
  query,
  results,
  loading,
  error,
  recentSearches,
  onSelect,
  onSelectRecentSearch,
  hasMore,
  onLoadMore,
}: Props) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initUser = async () => {
      const state = await getAuthState();
      setCurrentUser(state.user?.user_metadata?.user_name || null);
    };
    initUser();
  }, []);

  const handleScroll = useCallback((node: HTMLDivElement) => {
    if (loading || !hasMore) return;

    const threshold = 50; // pixels from bottom
    if (node.scrollHeight - node.scrollTop - node.clientHeight < threshold) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (!dropdown) return;

    const handleScrollEvent = () => handleScroll(dropdown);
    dropdown.addEventListener('scroll', handleScrollEvent);
    return () => dropdown.removeEventListener('scroll', handleScrollEvent);
  }, [handleScroll]);

  if (!query && recentSearches.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg" style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: theme.colors.text.secondary, borderTopColor: 'transparent' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg" style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="px-4 py-3">
          <div className="text-sm" style={{ color: theme.colors.error.primary }}>
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  if (!query && recentSearches.length > 0) {
    return (
      <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg" style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="py-2">
          <div className="px-3 py-1.5">
            <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
              Recent Searches
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {recentSearches.slice(0, 5).map((result) => (
              <button
                key={result.id}
                onClick={() => onSelectRecentSearch(result)}
                className="w-full px-3 py-2 text-left hover:bg-gray-500/5 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-sm truncate" style={{ color: theme.colors.text.primary }}>
                    {result.owner}/{result.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sortedResults = results.reduce((acc, repo, index) => {
    if (repo.owner === currentUser) {
      acc.owned.push({ ...repo, batchIndex: Math.floor((acc.owned.length) / 10) });
    } else {
      acc.other.push({ ...repo, batchIndex: Math.floor((acc.other.length) / 10) });
    }
    return acc;
  }, { owned: [] as (SearchResult & { batchIndex: number })[], other: [] as (SearchResult & { batchIndex: number })[] });

  // Sort both arrays by stars
  sortedResults.owned.sort((a, b) => b.stargazersCount - a.stargazersCount);
  sortedResults.other.sort((a, b) => b.stargazersCount - a.stargazersCount);

  const renderResults = (items: (SearchResult & { batchIndex: number })[]) => {
    let currentBatch = -1;
    return items.map((repo, index) => {
      const showSeparator = repo.batchIndex !== currentBatch && index !== 0 && index % 10 === 0;
      currentBatch = repo.batchIndex;
      return (
        <div key={repo.id}>
          {showSeparator && (
            <div className="my-2 border-t" style={{ borderColor: theme.colors.border.primary }} />
          )}
          <button
            onClick={() => onSelect(repo)}
            className="w-full px-3 py-2 text-left hover:bg-gray-500/5 transition-colors"
          >
            <div className="flex items-center">
              <span className="text-sm truncate" style={{ color: theme.colors.text.primary }}>
                {repo.owner}/{repo.name}
              </span>
            </div>
          </button>
        </div>
      );
    });
  };

  return (
    <CustomScrollbar
      ref={dropdownRef}
      className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-96 overflow-y-auto"
      style={{ backgroundColor: theme.colors.background.secondary }}
    >
      <div className="py-2">
        {sortedResults.owned.length > 0 && (
          <>
            <div className="px-3 py-1.5">
              <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                Owned
              </div>
            </div>
            <div>
              {renderResults(sortedResults.owned)}
            </div>
          </>
        )}

        {sortedResults.owned.length > 0 && sortedResults.other.length > 0 && (
          <div className="my-2 border-t" style={{ borderColor: theme.colors.border.primary }} />
        )}

        {sortedResults.other.length > 0 && (
          <>
            <div className="px-3 py-1.5">
              <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                All Results
              </div>
            </div>
            <div>
              {renderResults(sortedResults.other)}
            </div>
          </>
        )}

        {loading && (
          <div ref={loadingRef} className="px-3 py-2 flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: theme.colors.text.secondary, borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && !hasMore && results.length > 0 && (
          <div className="px-3 py-2 text-center text-sm" style={{ color: theme.colors.text.secondary }}>
            End of Results
          </div>
        )}
      </div>
    </CustomScrollbar>
  );
}
