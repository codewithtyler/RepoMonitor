import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { theme } from '@/config/theme';
import { SearchResultsDropdown } from './search-results-dropdown';
import { useSearch } from '@/lib/contexts/search-context';
import { useUser } from '@/lib/auth/hooks';
import { useGitHub } from '@/lib/hooks/use-github';
import { supabase } from '@/lib/auth/supabase-client';
import { createNotification } from '@/lib/hooks/use-notifications';
import type { SearchResult } from '@/lib/contexts/search-context';

export function SearchBar() {
  const { user } = useUser();
  const { client, withGitHub } = useGitHub();
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
    selectRecentSearch
  } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTrackRepository = async (repo: SearchResult) => {
    if (!user || !client) return;

    try {
      // Check if we have access and get permissions
      const access = await withGitHub(async (client) => {
        const repoData = await client.getRepository(repo.owner, repo.name);
        return {
          hasAccess: true,
          isPrivate: repoData.visibility === 'private',
          permissions: repoData.permissions
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
          github_id: repo.id,
          name: repo.name,
          owner: repo.owner,
          repository_permissions: access.permissions,
          last_analysis_timestamp: null,
          analyzed_by_user_id: null,
          is_public: !access.isPrivate
        });

      if (error) throw error;

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

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search repositories..."
          className="w-full px-4 py-2 pl-10 rounded-lg"
          style={{
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border.primary}`
          }}
        />
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2"
          style={{ color: theme.colors.text.secondary }}
        />
      </div>

      {isOpen && (
        <SearchResultsDropdown
          query={query}
          results={results}
          loading={loading}
          error={error}
          recentSearches={recentSearches}
          onSelect={(result) => {
            selectResult(result);
            setIsOpen(false);
          }}
          onSelectRecentSearch={(result) => {
            selectRecentSearch(result);
            setIsOpen(false);
          }}
          onRemoveRecentSearch={removeRecentSearch}
          onClearRecentSearches={clearRecentSearches}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onTrackRepository={handleTrackRepository}
        />
      )}
    </div>
  );
}
