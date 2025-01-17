import { useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useGitHub } from '@/lib/hooks/use-github';
import { useSearch } from '@/lib/contexts/search-context';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SearchResult {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string;
  stargazers_count: number;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 500);
  const { withGitHub } = useGitHub();
  const { handleRepositorySelect, isLoading: isSelecting } = useSearch();

  const { data: results, isLoading: isSearching, error } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) return [];

      console.log('Starting repository search with query:', debouncedQuery);

      return withGitHub(async (client) => {
        try {
          // Check if query matches owner/repo format
          const repoMatch = debouncedQuery.match(/^([^/\s]+)\/([^/\s]+)$/);
          let searchQuery;

          if (repoMatch) {
            // For exact repository searches
            searchQuery = `repo:${repoMatch[1]}/${repoMatch[2]} fork:true`;
            console.log('Searching for specific repository:', searchQuery);
          } else {
            // For general searches, include additional qualifiers to improve results
            searchQuery = `${debouncedQuery} in:name in:description is:public fork:true`;
            console.log('Performing general repository search:', searchQuery);
          }

          const response = await client.searchRepositories({
            query: searchQuery,
            per_page: 10,  // Increased from 5 to show more results
            sort: 'updated',
            order: 'desc'
          });

          console.log('Search results:', response);
          return response.items;
        } catch (error) {
          console.error('Error during repository search:', error);
          throw error;
        }
      });
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const handleSelect = async (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    await handleRepositorySelect(result.owner.login, result.name);
  };

  return (
    <div className="relative w-96">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search repositories (e.g. owner/repo)..."
        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {(isSearching || isSelecting) && (
        <div className="absolute right-3 top-2.5">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {isOpen && query.length >= 3 && (
        <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-auto z-50">
          {error ? (
            <div className="p-4 text-center text-red-500">
              Error searching repositories. Please try again.
            </div>
          ) : results && results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                >
                  <div className="font-medium">{result.owner.login}/{result.name}</div>
                  {result.description && (
                    <div className="text-sm text-gray-500 truncate">{result.description}</div>
                  )}
                  <div className="text-sm text-gray-400">
                    {result.stargazers_count.toLocaleString()} stars
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {isSearching ? 'Searching...' : 'No repositories found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
