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
}

interface SearchResult extends Repository {
  category?: 'exact' | 'owned' | 'favorited' | null
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
    hasNextPage: hasNextAPIPage,
    fetchNextPage: fetchNextAPIPage,
  } = useInfiniteQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async ({ pageParam = 1 }) => {
      if (!debouncedQuery || debouncedQuery.length < 3) return { items: [], nextPage: null }

      console.log('Starting repository search:', { query: debouncedQuery, page: pageParam })

      return withGitHub(async (client) => {
        try {
          // Check if query matches owner/repo format
          const repoMatch = debouncedQuery.match(/^([^/\s]+)\/([^/\s]+)$/)
          let searchQuery
          let response

          if (repoMatch && pageParam === 1) {
            // Only try exact match on first page
            searchQuery = `repo:${repoMatch[1]}/${repoMatch[2]}`
            console.log('Searching for specific repository:', searchQuery)

            try {
              const exactRepo = await client.getRepository(repoMatch[1], repoMatch[2]);
              response = {
                total_count: 1,
                items: [{ ...exactRepo, category: 'exact' }], // Mark as exact match
                incomplete_results: false
              };
            } catch (error) {
              console.log('Exact repository not found, falling back to search');
              response = await client.searchRepositories({
                query: `${searchQuery} fork:true`,
                per_page: RESULTS_PER_API_CALL,
                page: pageParam,
                sort: 'stars',
                order: 'desc'
              });
            }
          } else {
            // For general searches
            searchQuery = `${debouncedQuery} in:name in:description is:public fork:true`

            // If we have a user, first try to find their repositories
            if (user && pageParam === 1) {
              try {
                const userRepoQuery = `user:${user.user_metadata.user_name} ${debouncedQuery} in:name`;
                console.log('Searching user repositories:', userRepoQuery);

                const userRepos = await client.searchRepositories({
                  query: userRepoQuery,
                  per_page: 5,
                  sort: 'updated',
                  order: 'desc'
                });

                // If user has matching repos, combine them with general search
                if (userRepos.items.length > 0) {
                  const generalSearch = await client.searchRepositories({
                    query: searchQuery,
                    per_page: RESULTS_PER_API_CALL,
                    page: pageParam,
                    sort: 'stars',
                    order: 'desc'
                  });

                  // Combine results, removing duplicates
                  const userRepoIds = new Set(userRepos.items.map(repo => repo.id));
                  const filteredGeneralResults = generalSearch.items.filter(repo => !userRepoIds.has(repo.id));

                  response = {
                    total_count: userRepos.total_count + generalSearch.total_count,
                    items: [...userRepos.items, ...filteredGeneralResults],
                    incomplete_results: false
                  };
                } else {
                  // If no user repos found, fall back to general search
                  response = await client.searchRepositories({
                    query: searchQuery,
                    per_page: RESULTS_PER_API_CALL,
                    page: pageParam,
                    sort: 'stars',
                    order: 'desc'
                  });
                }
              } catch (error) {
                console.error('Error searching user repositories:', error);
                // Fall back to general search on error
                response = await client.searchRepositories({
                  query: searchQuery,
                  per_page: RESULTS_PER_API_CALL,
                  page: pageParam,
                  sort: 'stars',
                  order: 'desc'
                });
              }
            } else {
              // Regular search for subsequent pages or when no user
              response = await client.searchRepositories({
                query: searchQuery,
                per_page: RESULTS_PER_API_CALL,
                page: pageParam,
                sort: 'stars',
                order: 'desc'
              });
            }
          }

          // Sort and categorize results
          const sortedResults = response.items.map(item => {
            const result = item as SearchResult;

            // Keep exact match category if already set
            if (result.category === 'exact') {
              return result;
            }

            const repoOwner = result.owner.login.toLowerCase();
            const userName = user?.user_metadata.user_name?.toLowerCase() || '';

            // Check if this is an exact match for owner/repo format search
            if (repoMatch &&
              repoMatch[1].toLowerCase() === repoOwner &&
              repoMatch[2].toLowerCase() === result.name.toLowerCase()) {
              result.category = 'exact';
              console.log(`✓ Categorized as exact match: ${result.owner.login}/${result.name}`);
            }
            // Check if user owns the repository
            else if (user?.user_metadata.user_name && repoOwner === userName) {
              result.category = 'owned';
              console.log(`✓ Categorized as owned: ${result.owner.login}/${result.name}`);
            }
            // Check if repository is favorited
            else if (favorites?.some(fav =>
              fav.owner.toLowerCase() === repoOwner &&
              fav.name.toLowerCase() === result.name.toLowerCase()
            )) {
              result.category = 'favorited';
              console.log(`✓ Categorized as favorited: ${result.owner.login}/${result.name}`);
            } else {
              result.category = null;
              console.log(`- Categorized as other: ${result.owner.login}/${result.name}`);
            }

            return result;
          }).sort((a, b) => {
            // Exact matches get highest priority
            if (a.category === 'exact' && b.category !== 'exact') return -1;
            if (a.category !== 'exact' && b.category === 'exact') return 1;

            // Owned repositories get second priority
            if (a.category === 'owned' && b.category !== 'owned') return -1;
            if (a.category !== 'owned' && b.category === 'owned') return 1;

            // Favorited repositories get third priority
            if (a.category === 'favorited' && b.category !== 'favorited') return -1;
            if (a.category !== 'favorited' && b.category === 'favorited') return 1;

            // For repositories in the same category, sort by stars
            return b.stargazers_count - a.stargazers_count;
          });

          // Debug log the final sorted results
          console.log('Final categorized results:', sortedResults.map(r => ({
            repo: `${r.owner.login}/${r.name}`,
            category: r.category
          })));

          // Calculate next page
          const hasMore = !response.incomplete_results &&
            response.total_count > pageParam * RESULTS_PER_API_CALL;
          const nextPage = hasMore ? pageParam + 1 : null;

          return {
            items: sortedResults,
            nextPage,
            total: response.total_count
          };
        } catch (error) {
          console.error('Error during repository search:', error)
          throw error
        }
      })
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!debouncedQuery && debouncedQuery.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    keepPreviousData: true,
    cacheTime: 5 * 60 * 1000,
    // Reset the cache when the query changes
    gcTime: 0
  });

  // Get all fetched results
  const allResults = data?.pages.flatMap(page => page.items) ?? [];

  // Calculate if we need to show more results from our cache or fetch more from API
  const totalFetchedResults = allResults.length;
  const displayedResults = allResults.slice(0, displayedPages * RESULTS_PER_PAGE);
  const hasMoreCachedResults = totalFetchedResults > displayedResults.length;

  const fetchNextPage = async () => {
    if (hasMoreCachedResults) {
      // If we have more results in cache, just show more
      setDisplayedPages(prev => prev + 1);
    } else if (hasNextAPIPage) {
      // If we need more results, fetch from API
      await fetchNextAPIPage();
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
        hasNextPage: hasMoreCachedResults || hasNextAPIPage,
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
