import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
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
  isFork: boolean;
  source?: {
    owner: string;
    name: string;
  };
}

export interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  allResults: SearchResult[];
  loading: boolean;
  error: Error | null;
  recentSearches: SearchResult[];
  removeRecentSearch: (id: number) => void;
  clearRecentSearches: () => void;
  hasMore: boolean;
  loadMore: () => void;
  selectResult: (result: SearchResult) => void;
  selectRecentSearch: (result: SearchResult) => void;
  search: (searchQuery: string) => Promise<void>;
  addToRecentSearches: (result: SearchResult) => void;
  clearSearch: () => void;
}

export const SearchContext = createContext<SearchContextType | null>(null);

const MAX_RECENT_SEARCHES = 5;
const INITIAL_PAGE_SIZE = 100;  // Maximum results per page
const DISPLAY_BATCH_SIZE = 30;  // Show 30 results at a time
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const MIN_SEARCH_CHARS = 3; // Minimum characters required for search

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(getRecentSearches());
  const [hasMore, setHasMore] = useState(false);
  const searchCacheRef = useRef<CachedResults | null>(null);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const state = await getAuthState();
      setCurrentUser(state.user?.user_metadata?.user_name || null);
    };
    initUser();
  }, []);

  // Load more just updates the display count for the next batch
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    const nextCount = displayedCount + DISPLAY_BATCH_SIZE;
    setDisplayedCount(nextCount);
    setHasMore(nextCount < results.length);
  }, [displayedCount, results.length, hasMore]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setHasMore(false);
    setDisplayedCount(0);
    searchCacheRef.current = null;
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < MIN_SEARCH_CHARS) {
      clearSearch();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (isCacheValid(searchCacheRef.current, searchQuery)) {
        const cache = searchCacheRef.current!;
        setResults(cache.results);
        setDisplayedCount(DISPLAY_BATCH_SIZE);
        setHasMore(cache.results.length > DISPLAY_BATCH_SIZE);
        return;
      }

      const state = await getAuthState();
      if (!state.user) {
        throw new Error('User must be authenticated to search');
      }

      const client = await getGitHubClient(state.user.id);

      // Get search results first
      const searchResults = await client.searchRepositories(searchQuery, {
        query: searchQuery,
        page: 1,
        per_page: INITIAL_PAGE_SIZE,
        sort: 'updated',
        order: 'desc'
      });

      // Format the results
      const formattedResults = searchResults.items.map(repo => ({
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
        isAnalyzing: false,
        isFork: repo.fork || false,
        source: repo.source ? {
          owner: repo.source.owner.login,
          name: repo.source.name
        } : undefined
      }));

      // Remove duplicates and sort results
      const uniqueResults = Array.from(new Map(formattedResults.map(item => [item.id, item])).values());
      const sortedResults = uniqueResults.sort((a, b) => {
        // First, prioritize user's repositories
        const isUserRepoA = a.owner === currentUser;
        const isUserRepoB = b.owner === currentUser;
        if (isUserRepoA && !isUserRepoB) return -1;
        if (!isUserRepoA && isUserRepoB) return 1;

        // Then prioritize forks
        if (a.isFork && !b.isFork) return -1;
        if (!a.isFork && b.isFork) return 1;

        // Finally sort by stars
        return b.stargazersCount - a.stargazersCount;
      });

      setResults(sortedResults);
      setDisplayedCount(DISPLAY_BATCH_SIZE);
      setHasMore(sortedResults.length > DISPLAY_BATCH_SIZE);

      // Update cache
      searchCacheRef.current = {
        query: searchQuery,
        results: sortedResults,
        displayedCount: DISPLAY_BATCH_SIZE,
        timestamp: Date.now(),
        hasMore: sortedResults.length > DISPLAY_BATCH_SIZE,
        page: 1
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to search repositories'));
    } finally {
      setLoading(false);
    }
  }, [clearSearch, currentUser]);

  const selectResult = useCallback((result: SearchResult) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(r => r.id !== result.id);
      const updated = [result, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  const selectRecentSearch = useCallback((result: SearchResult) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(r => r.id !== result.id);
      const updated = [result, ...filtered];
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

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

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveRecentSearches([]);
  }, []);

  const value = {
    query,
    setQuery,
    results: results.slice(0, displayedCount), // Only return currently displayed results
    allResults: results, // Full set of results for internal use
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
    addToRecentSearches,
    clearSearch
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextType {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
