import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { getGitHubClient } from '@/lib/github'
import { getAuthState } from '@/lib/auth/global-state'
import type { GitHubRepository } from '@/lib/github'

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

const defaultContext: SearchContextType = {
  query: '',
  setQuery: () => { },
  results: {
    userRepositories: [],
    publicRepositories: []
  },
  loading: {
    userRepositories: false,
    publicRepositories: false
  },
  error: null,
  recentSearches: [],
  removeRecentSearch: () => { },
  clearRecentSearches: () => { },
  hasMore: false,
  loadMore: () => { },
  selectResult: () => { },
  selectRecentSearch: () => { },
  search: async () => { },
  addToRecentSearches: () => { },
  clearSearch: () => { }
};

const SearchContext = createContext<SearchContextType>(defaultContext);

const MAX_RECENT_SEARCHES = 5;
const DISPLAY_BATCH_SIZE = 10;  // Number of results to show per batch
const CACHE_DURATION = 300000;  // Cache duration (5 minutes)
const MIN_SEARCH_CHARS = 3;  // Minimum characters required for search
const MAX_TOTAL_RESULTS = 30;  // Maximum total results allowed

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

function convertGitHubRepository(repo: GitHubRepository): SearchResult {
  return {
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
  };
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchContextType['results']>({
    userRepositories: [],
    publicRepositories: []
  });
  const [loading, setLoading] = useState<SearchContextType['loading']>({
    userRepositories: false,
    publicRepositories: false
  });
  const [error, setError] = useState<Error | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(getRecentSearches());
  const [hasMore, setHasMore] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(0);
  const searchCacheRef = useRef<CachedResults | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const state = await getAuthState();
      setCurrentUser(state.user?.user_metadata?.user_name || null);
    };
    initUser();
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults({
      userRepositories: [],
      publicRepositories: []
    });
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
      // Step 1: Search user repositories
      setLoading(prev => ({ ...prev, userRepositories: true }));
      setError(null);

      const state = await getAuthState();
      if (!state.user) {
        throw new Error('User must be authenticated to search');
      }

      const client = await getGitHubClient(state.user.id);

      // Get all user repositories first
      const userRepos = await client.listUserRepositories();
      const matchingUserRepos = userRepos
        .map(convertGitHubRepository)
        .filter(repo =>
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

      setResults(prev => ({
        ...prev,
        userRepositories: matchingUserRepos
      }));
      setLoading(prev => ({ ...prev, userRepositories: false }));

      // Step 2: Search public repositories if needed
      if (matchingUserRepos.length < MAX_TOTAL_RESULTS) {
        setLoading(prev => ({ ...prev, publicRepositories: true }));
        const remainingSlots = MAX_TOTAL_RESULTS - matchingUserRepos.length;

        const publicSearchResponse = await client.searchPublicRepositories(searchQuery, remainingSlots);
        const publicRepos = publicSearchResponse.items
          .map(convertGitHubRepository)
          // Filter out any repos that are already in user repos
          .filter(repo => !matchingUserRepos.some(userRepo => userRepo.id === repo.id));

        setResults(prev => ({
          ...prev,
          publicRepositories: publicRepos
        }));

        setHasMore(publicRepos.length > DISPLAY_BATCH_SIZE);
        setDisplayedCount(Math.min(DISPLAY_BATCH_SIZE, publicRepos.length));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to search repositories'));
    } finally {
      setLoading({
        userRepositories: false,
        publicRepositories: false
      });
    }
  }, [clearSearch]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    const nextCount = Math.min(displayedCount + DISPLAY_BATCH_SIZE, results.publicRepositories.length);
    setDisplayedCount(nextCount);
    setHasMore(nextCount < results.publicRepositories.length);
  }, [displayedCount, results.publicRepositories.length, hasMore]);

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
      const updated = prev.filter(s => s.id !== id);
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
  return context as SearchContextType;
}
