import { GitFork, Star } from 'lucide-react';
import { theme } from '@/config/theme';
import { formatNumber } from '@/lib/utils/format';

interface Repository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  private: boolean;
  stargazers_count: number;
}

interface SearchResultsDropdownProps {
  results: Repository[];
  isLoading: boolean;
  onSelect: (repo: Repository) => void;
  show: boolean;
}

export function SearchResultsDropdown({
  results,
  isLoading,
  onSelect,
  show
}: SearchResultsDropdownProps) {
  if (!show || (!isLoading && results.length === 0)) {
    return null;
  }

  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 rounded-lg border overflow-hidden z-50"
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary
      }}
    >
      {isLoading ? (
        <div className="p-2 text-center text-sm" style={{ color: theme.colors.text.secondary }}>
          Searching repositories...
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {results.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-500/10 flex items-center justify-between"
            >
              <div className="flex items-center min-w-0">
                <GitFork className="h-4 w-4 mr-2 shrink-0" style={{ color: theme.colors.text.secondary }} />
                <div className="truncate">
                  <span style={{ color: theme.colors.text.primary }}>{repo.owner.login}/</span>
                  <span className="font-medium" style={{ color: theme.colors.text.primary }}>{repo.name}</span>
                  {repo.description && (
                    <p className="text-xs truncate" style={{ color: theme.colors.text.secondary }}>
                      {repo.description}
                    </p>
                  )}
                </div>
              </div>
              {repo.stargazers_count > 0 && (
                <div
                  className="ml-4 flex items-center text-xs"
                  style={{ color: theme.colors.text.secondary }}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {formatNumber(repo.stargazers_count)}
                </div>
              )}
            </button>
          ))}
          {results.length === 10 && (
            <div
              className="px-3 py-2 text-xs text-center border-t"
              style={{
                color: theme.colors.text.secondary,
                borderColor: theme.colors.border.primary
              }}
            >
              Showing top 10 results. Refine your search to find more repositories.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
