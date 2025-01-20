import { theme } from '@/config/theme';
import { SearchResult } from '@/lib/contexts/search-context';

interface SearchResultsDropdownProps {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  recentSearches: SearchResult[];
  onSelect: (repository: { owner: string; name: string }) => void;
  onRemoveRecentSearch: (id: number) => void;
}

export function SearchResultsDropdown({
  query,
  results,
  loading,
  error,
  recentSearches,
  onSelect,
  onRemoveRecentSearch
}: SearchResultsDropdownProps) {
  if (loading) {
    return (
      <div
        className="p-2 rounded-lg shadow-lg border"
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary
        }}
      >
        <div className="text-sm text-center py-2" style={{ color: theme.colors.text.secondary }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-2 rounded-lg shadow-lg border"
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary
        }}
      >
        <div className="text-sm text-center py-2" style={{ color: theme.colors.error.primary }}>
          {error.message}
        </div>
      </div>
    );
  }

  if (!query && recentSearches.length === 0) {
    return null;
  }

  const displayResults = query ? results : recentSearches;

  if (query && displayResults.length === 0) {
    return (
      <div
        className="p-2 rounded-lg shadow-lg border"
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary
        }}
      >
        <div className="text-sm text-center py-2" style={{ color: theme.colors.text.secondary }}>
          No results found
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg shadow-lg border"
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary
      }}
    >
      {!query && (
        <div className="p-2 border-b" style={{ borderColor: theme.colors.border.primary }}>
          <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
            Recent Searches
          </div>
        </div>
      )}
      <div className="p-1">
        {displayResults.map(result => (
          <div
            key={result.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-500/10 cursor-pointer"
            onClick={() => onSelect({ owner: result.owner, name: result.name })}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" style={{ color: theme.colors.text.primary }}>
                  {result.owner}/{result.name}
                </span>
                {result.visibility === 'private' && (
                  <span
                    className="px-1.5 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: theme.colors.background.primary,
                      color: theme.colors.text.secondary
                    }}
                  >
                    Private
                  </span>
                )}
              </div>
              {result.description && (
                <div
                  className="text-sm truncate mt-0.5"
                  style={{ color: theme.colors.text.secondary }}
                >
                  {result.description}
                </div>
              )}
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  ★ {result.stargazersCount.toLocaleString()}
                </span>
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  🔀 {result.forksCount.toLocaleString()}
                </span>
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  ⚠️ {result.openIssuesCount.toLocaleString()}
                </span>
              </div>
            </div>
            {!query && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onRemoveRecentSearch(result.id);
                }}
                className="p-1 rounded-full hover:bg-gray-500/20"
                style={{ color: theme.colors.text.secondary }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
