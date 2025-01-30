import { useEffect, useState, useRef, useCallback } from 'react';
import { Star, X } from 'lucide-react';
import { getAuthState } from '@/lib/auth/global-state';
import { theme } from '@/config/theme';
import type { SearchResult } from '@/lib/contexts/search-context';

const DISPLAY_BATCH_SIZE = 10; // Number of items to show per batch

interface Props {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  recentSearches: SearchResult[];
  onSelect: (result: SearchResult) => void;
  onSelectRecentSearch: (result: SearchResult) => void;
  onRemoveRecentSearch: (id: number) => void;
  onClearRecentSearches: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  onTrackRepository: (repo: SearchResult) => void;
}

export function SearchResultsDropdown({
  query,
  results,
  loading,
  error,
  recentSearches,
  onSelect,
  onSelectRecentSearch,
  onRemoveRecentSearch,
  onClearRecentSearches,
  hasMore,
  onLoadMore,
  onTrackRepository
}: Props) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initUser = async () => {
      const state = await getAuthState();
      setCurrentUser(state.user?.user_metadata?.user_name || null);
    };
    initUser();
  }, []);

  const handleScroll = useCallback(() => {
    if (!dropdownRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current;
    const threshold = 50; // pixels from bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (!dropdown) return;

    dropdown.addEventListener('scroll', handleScroll);
    return () => dropdown.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (error) {
    return (
      <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg overflow-hidden" style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="px-3 py-2 text-sm" style={{ color: theme.colors.text.error }}>
          {error.message}
        </div>
      </div>
    );
  }

  const renderRepositoryItem = (repo: SearchResult, isRecent: boolean) => (
    <div
      key={repo.id}
      onClick={() => isRecent ? onSelectRecentSearch(repo) : onSelect(repo)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          isRecent ? onSelectRecentSearch(repo) : onSelect(repo);
        }
      }}
      role="button"
      tabIndex={0}
      className="w-full px-3 py-2 text-left hover:bg-gray-500/5 transition-colors group cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="truncate">
          <span style={{ color: theme.colors.text.primary }}>{repo.owner}/</span>
          <span className="font-medium" style={{ color: theme.colors.text.primary }}>{repo.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
            <span className="text-xs">{repo.stargazersCount.toLocaleString()}</span>
            <Star className="h-4 w-4" />
          </div>
          {isRecent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemoveRecentSearch(repo.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove from recent searches"
            >
              <X className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderBatchSeparator = () => (
    <div className="px-3 py-2">
      <div className="w-full h-px" style={{ backgroundColor: theme.colors.border.primary }} />
    </div>
  );

  const renderResults = (repos: SearchResult[], isOwned: boolean = false, startIndex: number = 0) => {
    return repos.reduce((acc: JSX.Element[], repo, index) => {
      const globalIndex = startIndex + index;
      // Add separator every 10 items, but not at the start
      if (globalIndex > 0 && globalIndex % 10 === 0) {
        acc.push(renderBatchSeparator());
      }
      acc.push(renderRepositoryItem(repo, false));
      return acc;
    }, []);
  };

  // Limit total results to 30, prioritizing owned repositories
  const ownedRepos = results.filter(repo => repo.owner === currentUser);
  const otherRepos = results.filter(repo => repo.owner !== currentUser);
  const totalAllowed = 30;
  const ownedCount = ownedRepos.length;
  const otherCount = Math.min(otherRepos.length, totalAllowed - ownedCount);
  const limitedOtherRepos = otherRepos.slice(0, otherCount);

  return (
    <div
      ref={dropdownRef}
      className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-[24rem] overflow-y-auto bg-[#0d1117] border border-[#30363d]"
      onScroll={handleScroll}
    >
      <div className="py-2">
        {query ? (
          // Search Results
          results.length > 0 ? (
            <>
              {/* Owned Repositories */}
              {ownedRepos.length > 0 && (
                <>
                  <div className="px-3 py-1.5">
                    <div className="text-xs font-medium text-[#8b949e]">
                      Owned
                    </div>
                  </div>
                  {renderResults(ownedRepos, true, 0)}
                </>
              )}

              {/* Other Repositories */}
              {limitedOtherRepos.length > 0 && (
                <>
                  <div className="relative px-3 py-2">
                    <div className="absolute inset-0 flex items-center px-3">
                      <div className="w-full h-px bg-[#30363d]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 text-xs font-medium bg-[#0d1117] text-[#8b949e]">
                        All Results
                      </span>
                    </div>
                  </div>
                  {renderResults(limitedOtherRepos, false, ownedCount)}
                </>
              )}
            </>
          ) : !loading && (
            <div className="px-3 py-2 text-sm text-[#8b949e]">
              No repositories found
            </div>
          )
        ) : recentSearches.length > 0 ? (
          // Recent Searches
          <>
            <div className="px-3 py-1.5 flex justify-between items-center">
              <div className="text-xs font-medium text-[#8b949e]">
                Recent Searches
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onClearRecentSearches();
                }}
                className="text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
              >
                Clear All
              </button>
            </div>
            {recentSearches.slice(0, 5).map(repo => renderRepositoryItem(repo, true))}
          </>
        ) : (
          // Default message when no history and no search
          <div className="px-4 py-3 text-sm text-[#8b949e]">
            <p className="mb-2">Welcome to Repository Search!</p>
            <p className="text-xs">Start typing to search for repositories. Your recent searches will appear here.</p>
          </div>
        )}

        {loading && (
          <div className="px-3 py-2 flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#8b949e] border-t-transparent" />
          </div>
        )}

        {!loading && !hasMore && results.length > 0 && (
          <div className="px-3 py-2 text-xs text-center text-[#8b949e]">
            End of results
          </div>
        )}
      </div>
    </div>
  );
}
