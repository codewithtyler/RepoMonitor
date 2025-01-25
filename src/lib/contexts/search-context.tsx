import { createContext, useContext, useState, useCallback } from 'react'
import { getGitHubClient } from '@/lib/github'
import { getAuthState } from '@/lib/auth/global-state'

export interface SearchResult {
  id: number;
  owner: string;
  name: string;
  description: string | null;
  url: string;
  visibility: 'public' | 'private';
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  subscribersCount: number;
}

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  recentSearches: SearchResult[];
  removeRecentSearch: (id: number) => void;
  search: (searchQuery: string) => Promise<void>;
}

const SearchContext = createContext<SearchContextType | null>(null);

const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): SearchResult[] {
  try {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: SearchResult[]) {
  try {
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  } catch {
    // Ignore storage errors
  }
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(getRecentSearches());

  const removeRecentSearch = useCallback((id: number) => {
    setRecentSearches(prev => {
      const updated = prev.filter(search => search.id !== id);
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    try {
      const state = await getAuthState();
      if (!state.user) {
        throw new Error('User must be authenticated to search');
      }

      setLoading(true);
      setError(null);

      const client = await getGitHubClient(state.user.id);
      const searchResults = await client.searchRepositories(searchQuery);

      const formattedResults: SearchResult[] = searchResults.items.map(repo => ({
        id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        visibility: repo.visibility as 'public' | 'private',
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        subscribersCount: repo.subscribers_count || 0
      }));

      setResults(formattedResults);

      // Add first result to recent searches if it exists
      if (formattedResults.length > 0) {
        setRecentSearches(prev => {
          const updated = [formattedResults[0], ...prev.filter(s => s.id !== formattedResults[0].id)].slice(0, MAX_RECENT_SEARCHES);
          saveRecentSearches(updated);
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to search repositories'));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        results,
        loading,
        error,
        recentSearches,
        removeRecentSearch,
        search
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
