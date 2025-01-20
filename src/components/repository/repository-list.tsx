import { type Repository } from '@/lib/hooks/use-repository-data';
import { theme } from '@/config/theme';

interface RepositoryListProps {
  repositories: Repository[];
  onSelect: (repository: Repository) => void;
}

export function RepositoryList({ repositories, onSelect }: RepositoryListProps) {
  if (repositories.length === 0) {
    return (
      <div className="p-4 text-center" style={{ color: theme.colors.text.secondary }}>
        No repositories found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {repositories.map(repository => (
        <button
          key={repository.id}
          onClick={() => onSelect(repository)}
          className="w-full p-4 rounded-lg border hover:bg-gray-500/5 text-left transition-colors"
          style={{
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.primary
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" style={{ color: theme.colors.text.primary }}>
                  {repository.owner}/{repository.name}
                </span>
                {repository.visibility === 'private' && (
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: theme.colors.background.hover,
                      color: theme.colors.text.secondary
                    }}
                  >
                    Private
                  </span>
                )}
              </div>
              {repository.description && (
                <div className="text-sm truncate mt-1" style={{ color: theme.colors.text.secondary }}>
                  {repository.description}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 ml-4">
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>⭐</span>
                <span className="text-xs tabular-nums" style={{ color: theme.colors.text.secondary }}>
                  {repository.stargazersCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>🔄</span>
                <span className="text-xs tabular-nums" style={{ color: theme.colors.text.secondary }}>
                  {repository.forksCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>⚠️</span>
                <span className="text-xs tabular-nums" style={{ color: theme.colors.text.secondary }}>
                  {repository.openIssuesCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
