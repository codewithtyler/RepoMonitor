import { createContext, useContext, useState, useCallback, useRef } from 'react'
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
  lastAnalysisTimestamp?: string | null;
  isAnalyzing?: boolean;
}

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  recentSearches: SearchResult[];
  removeRecentSearch: (id: number) => void;
  clearRecentSearches: () => void;
  search: (searchQuery: string) => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  addToRecentSearches: (result: SearchResult) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

const MAX_RECENT_SEARCHES = 5;
const INITIAL_PAGE_SIZE = 30;  // Initial fetch size
const DISPLAY_BATCH_SIZE = 10; // Number of items to show per batch
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

interface CachedResults {
  query: string;
  results: SearchResult[];
  displayedCount: number;
  timestamp: number;
  hasMore: boolean;
  page: number;
}

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

function isCacheValid(cache: CachedResults | null, query: string): boolean {
  if (!cache || cache.query !== query) return false;
  const now = Date.now();
  return now - cache.timestamp < CACHE_DURATION;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [displayedResults, setDisplayedResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(getRecentSearches());
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const searchCacheRef = useRef<CachedResults | null>(null);

  const addToRecentSearches = useCallback((result: SearchResult) => {
    setRecentSearches(prev => {
      const updated = [result, ...prev.filter(s => s.id !== result.id)].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback((id: number) => {
    setRecentSearches(prev => {
      const updated = prev.filter(search => search.id !== id);
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  const searchWithCache = useCallback(async (searchQuery: string, page: number, pageSize: number) => {
    const state = await getAuthState();
    if (!state.user) {
      throw new Error('User must be authenticated to search');
    }

    const client = await getGitHubClient(state.user.id);
    const searchResults = await client.searchRepositories(searchQuery, {
      query: searchQuery,
      page,
      per_page: pageSize,
      sort: 'stars',
      order: 'desc'
    });

    return searchResults.items.map(repo => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      visibility: repo.visibility as 'public' | 'private',
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      subscribersCount: repo.subscribers_count || 0,
      lastAnalysisTimestamp: null,
      isAnalyzing: false
    }));
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setDisplayedResults([]);
      setResults([]);

      // Check cache first
      if (isCacheValid(searchCacheRef.current, searchQuery)) {
        const cache = searchCacheRef.current!;
        setResults(cache.results);
        setDisplayedResults(cache.results.slice(0, DISPLAY_BATCH_SIZE));
        setHasMore(cache.hasMore);
        return;
      }

      const results = await searchWithCache(searchQuery, 1, INITIAL_PAGE_SIZE);
      setResults(results);
      setDisplayedResults(results.slice(0, DISPLAY_BATCH_SIZE));
      setHasMore(results.length === INITIAL_PAGE_SIZE);

      // Update cache
      searchCacheRef.current = {
        query: searchQuery,
        results,
        displayedCount: DISPLAY_BATCH_SIZE,
        timestamp: Date.now(),
        hasMore: results.length === INITIAL_PAGE_SIZE,
        page: 1
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to search repositories'));
    } finally {
      setLoading(false);
    }
  }, [searchWithCache]);

  const loadMore = useCallback(async () => {
    if (!query || loading || !hasMore) return;

    try {
      setLoading(true);

      // Only show more from existing results (max 30)
      const nextBatchEnd = displayedResults.length + DISPLAY_BATCH_SIZE;
      const newDisplayedResults = results.slice(0, nextBatchEnd);
      setDisplayedResults(newDisplayedResults);

      if (searchCacheRef.current && searchCacheRef.current.query === query) {
        searchCacheRef.current.displayedCount = nextBatchEnd;
      }

      // Set hasMore to false when we've shown all 30 results
      setHasMore(nextBatchEnd < results.length);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more results'));
    } finally {
      setLoading(false);
    }
  }, [query, loading, hasMore, results, displayedResults]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setDisplayedResults([]);
    setHasMore(false);
    setCurrentPage(1);
    setError(null);
    searchCacheRef.current = null;
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveRecentSearches([]);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        results: displayedResults,
        loading,
        error,
        recentSearches,
        removeRecentSearch,
        clearRecentSearches,
        search,
        hasMore,
        loadMore,
        addToRecentSearches,
        clearSearch
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
