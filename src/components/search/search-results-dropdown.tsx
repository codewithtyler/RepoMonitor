import { GitFork, Star } from 'lucide-react';
import { theme } from '@/config/theme';

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
      className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] mt-1 rounded-lg border overflow-hidden max-h-[400px] overflow-y-auto"
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
        <div>
          {results.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-500/10 flex items-center justify-between group"
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
                  className="ml-4 flex items-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: theme.colors.text.secondary }}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {repo.stargazers_count}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 