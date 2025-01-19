import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/use-debounce'
import { useGitHub } from '@/lib/hooks/use-github'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { getAuthState, subscribeToAuth } from '@/lib/auth/global-state'
import { useFavorites } from '@/lib/hooks/use-favorites'

const RESULTS_PER_API_CALL = 30;  // Number of results to fetch from API
const RESULTS_PER_PAGE = 10;      // Number of results to display per "page"
const MAX_RECENT_SEARCHES = 5;     // Maximum number of recent searches to store

interface Repository {
  id: number
  name: string
  owner: {
    login: string
  }
  description: string | null
  private: boolean
  stargazers_count: number
  category?: 'exact' | 'owned' | null
}

interface SearchResult extends Repository {
  category?: 'exact' | 'owned' | null
}

interface RecentSearch {
  query: string
  timestamp: number
}

interface SearchContextType {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => Promise<void>
  handleRepositorySelect: (owner: string, name: string, action: 'track' | 'analyze') => Promise<void>
  recentSearches: RecentSearch[]
  clearRecentSearches: () => void
  setRecentSearches: React.Dispatch<React.SetStateAction<RecentSearch[]>>
}

const SearchContext = createContext<SearchContextType | null>(null)

export function useSearch() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

// Get recent searches from session storage
const getRecentSearches = (): RecentSearch[] => {
  try {
    const stored = sessionStorage.getItem('recentSearches')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save recent searches to session storage
const saveRecentSearches = (searches: RecentSearch[]) => {
  try {
    sessionStorage.setItem('recentSearches', JSON.stringify(searches))
  } catch (error) {
    console.error('Error saving recent searches:', error)
  }
}

interface GitHubSearchResponse {
  items: Repository[]
  nextPage: number | null
  total: number
}

interface GitHubAPIResponse {
  total_count: number
  items: GitHubRepository[]
  incomplete_results: boolean
}

interface GitHubRepository {
  id: number
  name: string
  owner: {
    login: string
  }
  description: string | null
  visibility: string
  stargazers_count: number
  full_name: string
  html_url: string
  language: string | null
}

// Helper function to convert GitHub API response to our Repository type
const mapGitHubRepository = (repo: GitHubRepository, category?: 'exact' | 'owned' | null): Repository => ({
  id: repo.id,
  name: repo.name,
  owner: { login: repo.owner.login },
  description: repo.description,
  private: repo.visibility === 'private',
  stargazers_count: repo.stargazers_count,
  category
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [displayedPages, setDisplayedPages] = useState(1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(getRecentSearches());
  const debouncedQuery = useDebounce(query, 500);
  const { withGitHub } = useGitHub();
  const navigate = useNavigate();
  const { user } = getAuthState();
  const { favorites } = useFavorites();
  const queryClient = useQueryClient();

  // Debug log user metadata
  useEffect(() => {
    if (user) {
      console.log('User Metadata:', {
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        email: user.email
      });
    }
  }, [user]);

  // Update owner check logic
  const getUserName = () => {
    if (!user) return null;
    return user.user_metadata?.preferred_username ||
      user.user_metadata?.user_name ||
      user.user_metadata?.username ||
      user.user_metadata?.login;
  };

  // Clear results when query is empty
  useEffect(() => {
    if (!query) {
      setDisplayedPages(1);
      // Remove the search results from the cache when query is cleared
      queryClient.removeQueries({ queryKey: ['search'] });
    }
  }, [query, queryClient]);

  // Save recent searches when they change
  useEffect(() => {
    saveRecentSearches(recentSearches);
  }, [recentSearches]);

  // Add search to recent searches when query is executed
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 3) {
      setRecentSearches(prev => {
        const newSearches = prev.filter(s => s.query !== debouncedQuery);
        return [
          { query: debouncedQuery, timestamp: Date.now() },
          ...newSearches
        ].slice(0, MAX_RECENT_SEARCHES);
      });
    }
  }, [debouncedQuery]);

  const {
    data,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async ({ pageParam = 1 }): Promise<GitHubSearchResponse> => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        return { items: [], nextPage: null, total: 0 } as GitHubSearchResponse;
      }

      console.log('Starting repository search:', { query: debouncedQuery })

      return withGitHub(async (client) => {
        try {
          // Check if query matches owner/repo format
          const repoMatch = debouncedQuery.match(/^([^/\s]+)\/([^/\s]+)$/)
          let searchQuery
          let response

          if (repoMatch) {
            // Try exact match first
            try {
              const exactRepo = await client.getRepository(repoMatch[1], repoMatch[2]);
              return {
                items: [mapGitHubRepository(exactRepo, 'exact')],
                nextPage: null,
                total: 1
              } as GitHubSearchResponse;
            } catch (error) {
              console.log('Exact repository not found, falling back to search');
            }
          }

          // For general searches
          searchQuery = `${debouncedQuery} in:name in:description is:public fork:true`

          // If we have a user, first try to find their repositories
          if (user) {
            try {
              // Try user's repositories
              const userRepoQuery = `user:${user.user_metadata.user_name} ${debouncedQuery} in:name`;
              console.log('Searching user repositories:', userRepoQuery);

              const userRepos = await client.searchRepositories({
                query: userRepoQuery,
                per_page: 5,
                sort: 'updated',
                order: 'desc'
              });

              // Get general search results
              const generalSearch = await client.searchRepositories({
                query: searchQuery,
                per_page: RESULTS_PER_API_CALL,
                sort: 'stars',
                order: 'desc'
              });

              // Combine results, removing duplicates
              const userRepoIds = new Set(userRepos.items.map(repo => repo.id));
              const filteredGeneralResults = generalSearch.items
                .filter(repo => !userRepoIds.has(repo.id))
                .slice(0, RESULTS_PER_API_CALL - userRepos.items.length);

              response = {
                total_count: userRepos.total_count + generalSearch.total_count,
                items: [...userRepos.items, ...filteredGeneralResults],
                incomplete_results: false
              };
            } catch (error) {
              console.error('Error searching user repositories:', error);
              // Fall back to general search
              response = await client.searchRepositories({
                query: searchQuery,
                per_page: RESULTS_PER_API_CALL,
                sort: 'stars',
                order: 'desc'
              });
            }
          } else {
            // Regular search when no user
            response = await client.searchRepositories({
              query: searchQuery,
              per_page: RESULTS_PER_API_CALL,
              sort: 'stars',
              order: 'desc'
            });
          }

          // Sort and categorize results
          const sortedResults = response.items.map(item => {
            const result = mapGitHubRepository(item);
            const repoOwner = result.owner.login.toLowerCase();
            const userName = getUserName()?.toLowerCase();

            // Check if user owns the repository
            if (userName && userName === repoOwner) {
              result.category = 'owned';
              return result;
            }

            // If no other category applies, set to null
            result.category = null;
            return result;
          }).sort((a, b) => {
            // Owned repositories get highest priority
            if (a.category === 'owned' && b.category !== 'owned') return -1;
            if (a.category !== 'owned' && b.category === 'owned') return 1;

            // For repositories in the same category, sort by stars
            return b.stargazers_count - a.stargazers_count;
          });

          return {
            items: sortedResults,
            nextPage: null,
            total: response.total_count
          } as GitHubSearchResponse;
        } catch (error) {
          console.error('Error during repository search:', error)
          throw error
        }
      }) as Promise<GitHubSearchResponse>
    },
    getNextPageParam: () => null,
    enabled: !!debouncedQuery && debouncedQuery.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    gcTime: 0,
    initialPageParam: 1
  });

  // Get all fetched results
  const allResults = data?.pages.flatMap(page => page.items) ?? [];

  // Calculate if we need to show more results from our cache
  const totalFetchedResults = allResults.length;
  const displayedResults = allResults.slice(0, displayedPages * RESULTS_PER_PAGE);
  const hasMoreCachedResults = totalFetchedResults > displayedResults.length;

  const fetchNextPage = async () => {
    if (hasMoreCachedResults) {
      // If we have more results in cache, just show more
      setDisplayedPages(prev => prev + 1);
    }
  };

  const handleRepositorySelect = async (owner: string, name: string, action: 'track' | 'analyze') => {
    try {
      navigate('/dashboard', {
        state: {
          owner,
          name,
          action
        }
      })
    } catch (error) {
      console.error('Error selecting repository:', error)
      toast({
        title: 'Error',
        description: 'Failed to select repository. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    sessionStorage.removeItem('recentSearches')
  }

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        results: displayedResults,
        loading: isLoading,
        hasNextPage: hasMoreCachedResults,
        fetchNextPage,
        handleRepositorySelect,
        recentSearches,
        clearRecentSearches,
        setRecentSearches
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export { SearchContext }
