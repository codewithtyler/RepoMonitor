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
            <Star className="h-4 w-4" />
            <span className="text-xs">{repo.stargazersCount}</span>
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

  const renderResults = (repos: SearchResult[], isOwned: boolean = false) => {
    return repos.reduce((acc: JSX.Element[], repo, index) => {
      if (!isOwned && index > 0 && index % DISPLAY_BATCH_SIZE === 0) {
        acc.push(renderBatchSeparator());
      }
      acc.push(renderRepositoryItem(repo, false));
      return acc;
    }, []);
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-[24rem] overflow-y-auto"
      style={{ backgroundColor: theme.colors.background.secondary }}
      onScroll={handleScroll}
    >
      <div className="py-2">
        {query ? (
          // Search Results
          results.length > 0 && (
            <>
              {/* Owned Repositories */}
              {results.filter(repo => repo.owner === currentUser).length > 0 && (
                <>
                  <div className="px-3 py-1.5">
                    <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                      Owned
                    </div>
                  </div>
                  {renderResults(results.filter(repo => repo.owner === currentUser), true)}
                </>
              )}

              {/* Other Repositories */}
              {results.filter(repo => repo.owner !== currentUser).length > 0 && (
                <>
                  <div className="relative px-3 py-2">
                    <div className="absolute inset-0 flex items-center px-3">
                      <div className="w-full h-px" style={{ backgroundColor: theme.colors.border.primary }} />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 text-xs font-medium" style={{
                        color: theme.colors.text.secondary,
                        backgroundColor: theme.colors.background.secondary
                      }}>
                        All Results
                      </span>
                    </div>
                  </div>
                  {renderResults(results.filter(repo => repo.owner !== currentUser))}
                </>
              )}
            </>
          )
        ) : (
          // Recent Searches
          recentSearches.length > 0 && (
            <>
              <div className="px-3 py-1.5 flex justify-between items-center">
                <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                  Recent Searches
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onClearRecentSearches();
                  }}
                  className="text-xs hover:text-opacity-80 transition-opacity"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Clear All
                </button>
              </div>
              {recentSearches.slice(0, 5).map(repo => renderRepositoryItem(repo, true))}
            </>
          )
        )}

        {loading && (
          <div className="px-3 py-2 flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: theme.colors.text.secondary, borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && !hasMore && results.length > 0 && (
          <div className="px-3 py-2 text-xs text-center" style={{ color: theme.colors.text.secondary }}>
            End of results
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${theme.colors.background.secondary};
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme.colors.border.primary};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.text.secondary};
        }
      `}</style>
    </div>
  );
}
