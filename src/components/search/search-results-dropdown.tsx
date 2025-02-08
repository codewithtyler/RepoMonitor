import { useEffect, useState, useRef, useCallback } from 'react';
import { Star, X } from 'lucide-react';
import { getAuthState } from '@/lib/auth/global-state';
import { theme } from '@/config/theme';
import type { SearchResult } from '@/lib/contexts/search-context';

interface Props {
  query: string;
  results: {
    userRepositories: SearchResult[];
    publicRepositories: SearchResult[];
  };
  loading: {
    userRepositories: boolean;
    publicRepositories: boolean;
  };
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

    const allResults = [...results.userRepositories, ...results.publicRepositories];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev + 1;
          const max = allResults.length - 1;
          const newIndex = next > max ? 0 : next;
          itemRefs.current[newIndex]?.scrollIntoView({ block: 'nearest' });
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev - 1;
          const max = allResults.length - 1;
          const newIndex = next < 0 ? max : next;
          itemRefs.current[newIndex]?.scrollIntoView({ block: 'nearest' });
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedRepo = allResults[selectedIndex];
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
    if (!dropdownRef.current || loading.publicRepositories || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current;
    const threshold = 50; // pixels from bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      onLoadMore();
    }
  }, [loading.publicRepositories, hasMore, onLoadMore]);

  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (!dropdown) return;

    dropdown.addEventListener('scroll', handleScroll);
    return () => dropdown.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (error) {
    return (
      <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg overflow-hidden bg-[#0d1117] border border-[#30363d]">
        <div className="px-3 py-2 text-sm text-[#f85149]">
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

  return (
    <div
      ref={dropdownRef}
      className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-[24rem] overflow-y-auto bg-[#0d1117] border border-[#30363d]"
      onScroll={handleScroll}
    >
      <div className="py-2">
        {query ? (
          <>
            {/* Show min chars message when query is too short */}
            {query.trim().length < 3 ? (
              <div className="px-4 py-3 text-sm text-[#8b949e]">
                <p className="mb-2">Please enter at least 3 characters</p>
                <p className="text-xs">Type a few more characters to start searching repositories.</p>
              </div>
            ) : (loading.userRepositories || loading.publicRepositories) ? (
              <div className="px-4 py-3 text-sm text-[#8b949e]">
                <p className="mb-2">Searching repositories...</p>
                <p className="text-xs">We'll show results from your repositories and public repositories.</p>
              </div>
            ) : (
              <>
                {/* User Repositories Section */}
                {results.userRepositories.length > 0 && (
                  <>
                    <div className="px-3 py-1.5">
                      <div className="text-xs font-medium text-[#8b949e]">
                        Your Repositories
                      </div>
                    </div>
                    {results.userRepositories.map((repo, index) => renderRepositoryItem(repo, index))}
                  </>
                )}

                {/* Public Repositories Section */}
                {results.userRepositories.length > 0 && results.publicRepositories.length > 0 && (
                  <div className="relative px-3 py-2">
                    <div className="absolute inset-0 flex items-center px-3">
                      <div className="w-full h-px bg-[#30363d]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 text-xs font-medium bg-[#0d1117] text-[#8b949e]">
                        Other Results
                      </span>
                    </div>
                  </div>
                )}

                {results.publicRepositories.length > 0 && (
                  <>
                    {results.publicRepositories.map((repo, index) => (
                      <>
                        {renderBatchSeparator(index)}
                        {renderRepositoryItem(repo, index + results.userRepositories.length)}
                      </>
                    ))}
                  </>
                )}

                {/* No Results Message */}
                {results.userRepositories.length === 0 && results.publicRepositories.length === 0 && (
                  <div className="px-3 py-2 text-sm text-[#8b949e]">
                    No repositories found
                  </div>
                )}

                {/* Footer Message */}
                {(results.userRepositories.length > 0 || results.publicRepositories.length > 0) && (
                  <div className="px-3 py-2 text-center text-sm text-[#8b949e]">
                    End of results.
                  </div>
                )}
              </>
            )}
          </>
        ) : recentSearches.length > 0 ? (
          // Recent Searches
          <>
            <div className="px-3 py-1.5 flex justify-between items-center">
              <div className="text-xs font-medium text-[#8b949e]">
                Recent Searches
              </div>
              <button
                onClick={onClearRecentSearches}
                className="text-xs text-[#8b949e] hover:text-[#c9d1d9]"
              >
                Clear All
              </button>
            </div>
            {recentSearches.map((repo, index) => renderRepositoryItem(repo, index, true))}
          </>
        ) : (
          // Default welcome message when no history and no search
          <div className="px-4 py-3 text-sm text-[#8b949e]">
            <p className="mb-2">Welcome to Repository Search!</p>
            <p className="text-xs">Start typing to search for repositories. Your recent searches will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
