import { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useGitHub } from '@/lib/hooks/use-github'
import { useDebounce } from '@/hooks/use-debounce'
import { GitHubRepository } from '@/lib/github'
import { addRepository } from '@/lib/hooks/use-repository-data'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

interface SearchContextType {
  query: string
  setQuery: (query: string) => void
  results: GitHubRepository[]
  isLoading: boolean
  error: Error | null
  hasNextPage: boolean
  loadNextPage: () => void
  handleSelect: (repository: GitHubRepository) => Promise<void>
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const debouncedQuery = useDebounce(query, 1000)
  const { withGitHub } = useGitHub()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Reset page when query changes
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    setPage(1)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, page],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        return { items: [], total_count: 0, incomplete_results: false }
      }
      return withGitHub(async (client) => {
        console.log('Searching with query:', debouncedQuery, 'page:', page)
        return client.searchRepositories({
          query: debouncedQuery,
          page,
          per_page: 10,
          sort: 'updated',
          order: 'desc'
        })
      })
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 3 && !!withGitHub,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    keepPreviousData: true, // Keep showing previous results while loading new ones
  })

  const handleSelect = async (repository: GitHubRepository) => {
    try {
      await withGitHub(async (client) => {
        await addRepository(repository.owner.login, repository.name, client)
        // Force refetch of repositories data
        await queryClient.invalidateQueries({ queryKey: ['repositories'] })
        await queryClient.refetchQueries({ queryKey: ['repositories'] })
      })

      // Clear the search query after selection
      setQuery('')

      // Navigate to repository page
      navigate(`/repository/${repository.owner.login}/${repository.name}`)
    } catch (error) {
      // Log the error but don't redirect
      console.error('[SearchContext] Error adding repository:', error)

      // If it's a duplicate key error, still navigate to the repository page
      if (error instanceof Error && error.message.includes('duplicate key value')) {
        navigate(`/repository/${repository.owner.login}/${repository.name}`)
        return
      }

      throw error
    }
  }

  const loadNextPage = () => {
    if (data && data.total_count > page * 10) {
      setPage(prev => prev + 1)
    }
  }

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery: handleQueryChange,
        results: data?.items ?? [],
        isLoading,
        error: error as Error | null,
        hasNextPage: data ? data.total_count > page * 10 : false,
        loadNextPage,
        handleSelect
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
