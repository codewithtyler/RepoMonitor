import { GitHubRepository } from '@/lib/github';
import { Loader2, Star, GitFork, AlertCircle } from 'lucide-react';
import { theme } from '@/config/theme';

interface SearchResultsDropdownProps {
  results: GitHubRepository[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelect: (result: GitHubRepository) => Promise<void>;
}

export function SearchResultsDropdown({
  results,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  onSelect
}: SearchResultsDropdownProps) {
  if (!isLoading && !error && results.length === 0) {
    return null;
  }

  return (
    <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border"
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary
      }}>
      {error && (
        <div className="p-4 text-sm text-red-500 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Error: {error.message}</span>
        </div>
      )}

      {isLoading && results.length === 0 && (
        <div className="p-4 text-sm flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Searching repositories...</span>
        </div>
      )}

      {results.map((result) => (
        <button
          key={result.id}
          onClick={() => onSelect(result)}
          className="w-full p-3 text-left hover:bg-gray-100 flex flex-col gap-1 border-b last:border-b-0"
          style={{
            borderColor: theme.colors.border.primary,
            '&:hover': {
              backgroundColor: theme.colors.background.hover
            }
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{result.full_name}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
              {result.visibility}
            </span>
          </div>
          {result.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{result.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {result.stargazers_count}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="h-4 w-4" />
              {result.forks_count}
            </span>
          </div>
        </button>
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          className="w-full p-2 text-sm text-center hover:bg-gray-100 border-t"
          style={{
            borderColor: theme.colors.border.primary,
            '&:hover': {
              backgroundColor: theme.colors.background.hover
            }
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more...
            </span>
          ) : (
            'Load more results'
          )}
        </button>
      )}
    </div>
  );
}
