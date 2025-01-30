import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearch } from '@/lib/contexts/search-context';
import { useUser } from '@/lib/auth/hooks';
import { useGitHub } from '@/lib/hooks/use-github';
import { supabase } from '@/lib/auth/supabase-client';
import { createNotification } from '@/lib/hooks/use-notifications';
import type { SearchResult } from '@/lib/contexts/search-context';
import { Spinner } from '@/components/common/spinner';
import { SearchResultsDropdown } from './search-results-dropdown';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { RepositoryActionModal } from './repository-action-modal';

export function SearchBar() {
  const { user } = useUser();
  const { client, withGitHub } = useGitHub();
  const { selectRepository } = useAnalysis();
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    recentSearches,
    removeRecentSearch,
    clearRecentSearches,
    hasMore,
    loadMore,
    selectResult,
    selectRecentSearch,
    search,
    clearSearch
  } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleTrackRepository = async (repo: SearchResult) => {
    if (!user || !client) return;

    try {
      // Check if we have access and get permissions
      const access = await withGitHub(async (client) => {
        const repoData = await client.getRepository(repo.owner, repo.name);
        return {
          hasAccess: true,
          isPrivate: repoData.visibility === 'private',
          permissions: repoData.permissions,
          repoData
        };
      });

      if (!access?.hasAccess) {
        await createNotification({
          userId: user.id,
          title: 'Repository Access Error',
          message: 'You no longer have access to this repository.',
          type: 'SYSTEM_ERROR',
          metadata: {
            repository: `${repo.owner}/${repo.name}`
          }
        });
        return;
      }

      // Add repository to tracking
      const { error } = await supabase
        .from('repositories')
        .upsert({
          id: repo.id,
          github_id: repo.id,
          name: repo.name,
          owner: repo.owner,
          repository_permissions: {
            admin: access.permissions?.admin || false,
            push: access.permissions?.push || false,
            pull: access.permissions?.pull || false,
            private: access.isPrivate,
            public: !access.isPrivate
          },
          last_analysis_timestamp: null,
          analyzed_by_user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error tracking repository:', error);
        throw error;
      }

      await createNotification({
        userId: user.id,
        title: 'Repository Tracked',
        message: `Now tracking ${repo.owner}/${repo.name}`,
        type: 'DATA_COLLECTION_COMPLETE',
        metadata: {
          repository: `${repo.owner}/${repo.name}`
        }
      });

      // Close the dropdown
      setIsOpen(false);
    } catch (error) {
      console.error('Error in handleTrackRepository:', error);
      await createNotification({
        userId: user.id,
        title: 'Repository Tracking Error',
        message: 'Failed to track repository. Please try again.',
        type: 'SYSTEM_ERROR',
        metadata: {
          repository: `${repo.owner}/${repo.name}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  const handleSelect = (result: SearchResult) => {
    selectResult(result);
    selectRepository(result);
    setIsOpen(false);
  };

  const handleSelectRecentSearch = (result: SearchResult) => {
    selectRecentSearch(result);
    selectRepository(result);
    setIsOpen(false);
  };

  const handleBlur = useCallback((event: React.FocusEvent) => {
    // Check if the related target is within the search container
    const isWithinContainer = searchContainerRef.current?.contains(event.relatedTarget as Node);
    if (!isWithinContainer) {
      setIsOpen(false);
      setQuery(''); // Clear the input when focus is lost
      clearSearch(); // Clear the search results
    }
  }, [setQuery, clearSearch]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Add effect to trigger search when query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        search(query);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, search]);

  return (
    <div
      ref={searchContainerRef}
      className="relative w-full"
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search repositories..."
          className="w-full px-4 py-2 text-sm bg-transparent border rounded-md border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          aria-label="Search repositories"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <Spinner size="sm" />
          </div>
        )}
      </div>
      {isOpen && (
        <SearchResultsDropdown
          query={query}
          results={results}
          loading={loading}
          error={error}
          recentSearches={recentSearches}
          onSelect={handleSelect}
          onSelectRecentSearch={handleSelectRecentSearch}
          onRemoveRecentSearch={removeRecentSearch}
          onClearRecentSearches={clearRecentSearches}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onTrackRepository={handleTrackRepository}
        />
      )}
      {isOpen && query.trim().length > 0 && query.trim().length < 3 && (
        <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg overflow-hidden bg-background-secondary">
          <div className="px-3 py-2 text-sm text-text-secondary">
            Please enter at least 3 characters to search
          </div>
        </div>
      )}
    </div>
  );
}
