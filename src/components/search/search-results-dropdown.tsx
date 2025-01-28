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

  const renderResults = (items: SearchResult[], isRecent = false): JSX.Element => {
    const ownedRepos = items.filter(repo => repo.owner === currentUser);
    const otherRepos = items.filter(repo => repo.owner !== currentUser);

    return (
      <>
        {query && results.length > 0 && (
          <>
            {ownedRepos.length > 0 && (
              <>
                <div className="px-3 py-1.5">
                  <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                    Owned
                  </div>
                </div>
                {ownedRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => isRecent ? onSelectRecentSearch(repo) : onSelect(repo)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-500/5 transition-colors group"
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
                            onClick={(e) => { e.stopPropagation(); onRemoveRecentSearch(repo.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {otherRepos.length > 0 && (
              <>
                {ownedRepos.length > 0 && (
                  <div className="mx-3 my-1 border-t" style={{ borderColor: theme.colors.border.primary }} />
                )}
                <div className="px-3 py-1.5">
                  <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                    All Results
                  </div>
                </div>
                {otherRepos.slice(0, DISPLAY_BATCH_SIZE - ownedRepos.length).map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => isRecent ? onSelectRecentSearch(repo) : onSelect(repo)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-500/5 transition-colors group"
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
                            onClick={(e) => { e.stopPropagation(); onRemoveRecentSearch(repo.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </>
        )}

        {!query && recentSearches.length > 0 && renderResults(recentSearches.slice(0, 5), true)}

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
      </>
    );
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-[24rem] overflow-y-auto"
      style={{ backgroundColor: theme.colors.background.secondary }}
    >
      <div className="py-2">
        {renderResults(results)}
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
