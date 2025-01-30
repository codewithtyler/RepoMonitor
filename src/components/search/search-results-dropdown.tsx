import { useEffect, useState, useRef, useCallback } from 'react';
import { Star, X } from 'lucide-react';
import { getAuthState } from '@/lib/auth/global-state';
import { theme } from '@/config/theme';
import type { SearchResult } from '@/lib/contexts/search-context';

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
  onTrackRepository: () => void;
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
  onLoadMore
}: Props) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const initUser = async () => {
      const state = await getAuthState();
      setCurrentUser(state.user?.user_metadata?.user_name || null);
    };
    initUser();
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!dropdownRef.current) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev + 1;
          const max = results.length - 1;
          const newIndex = next > max ? 0 : next;
          itemRefs.current[newIndex]?.scrollIntoView({ block: 'nearest' });
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev - 1;
          const max = results.length - 1;
          const newIndex = next < 0 ? max : next;
          itemRefs.current[newIndex]?.scrollIntoView({ block: 'nearest' });
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedRepo = results[selectedIndex];
          if (selectedRepo) {
            onSelect(selectedRepo);
          }
        }
        break;
    }
  }, [selectedIndex, results, onSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
      <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="px-3 py-2 text-sm" style={{ color: theme.colors.text.error }}>
          {error.message}
        </div>
      </div>
    );
  }

  const renderRepositoryItem = (repo: SearchResult, index: number, isRecent: boolean = false) => (
    <button
      ref={el => itemRefs.current[index] = el}
      key={repo.id}
      onClick={() => isRecent ? onSelectRecentSearch(repo) : onSelect(repo)}
      className={`w-full px-4 py-2 transition-colors text-left flex items-center justify-between group
        ${selectedIndex === index ? 'bg-[#21262d]' : 'hover:bg-[#21262d]'}`}
      aria-selected={selectedIndex === index}
      role="option"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#c9d1d9] truncate">
            {repo.owner}/{repo.name}
          </span>
          {repo.visibility === 'private' && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-[#30363d] text-[#8b949e]">
              Private
            </span>
          )}
        </div>
        {repo.description && (
          <p className="text-sm text-[#8b949e] truncate mt-0.5">{repo.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[#8b949e]">
          <span className="text-xs">{repo.stargazersCount.toLocaleString()}</span>
          <Star className="h-4 w-4" />
        </div>
        {isRecent && (
          <div
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveRecentSearch(repo.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Remove from recent searches"
          >
            <X className="h-4 w-4 text-[#8b949e]" />
          </div>
        )}
      </div>
    </button>
  );

  const renderBatchSeparator = (index: number) => {
    if (index > 0 && index % 10 === 0) {
      return (
        <div className="relative px-3 py-2">
          <div className="absolute inset-0 flex items-center px-3">
            <div className="w-full h-px bg-[#30363d]" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 text-xs font-medium bg-[#0d1117] text-[#8b949e]">
              More Results
            </span>
          </div>
        </div>
      );
    }
    return null;
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
      className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-[24rem] overflow-y-auto bg-[#0d1117] border border-[#30363d]"
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
                  {renderBatchSeparator(0)}
                  {ownedRepos.map((repo, index) => renderRepositoryItem(repo, index))}
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
                  {limitedOtherRepos.map((repo, index) => renderRepositoryItem(repo, index + ownedCount))}
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
            {recentSearches.slice(0, 5).map((repo, index) => renderRepositoryItem(repo, index, true))}
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
