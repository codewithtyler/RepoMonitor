import { useRepositorySelection } from '@/lib/hooks/use-repository-selection';
import type { Repository } from '@/lib/hooks/use-repository-data';
import { theme } from '@/config/theme';

interface Props {
  repositories: Repository[];
  title?: string;
}

export function RepositoryList({ repositories, title }: Props) {
  const { handleRepositorySelect } = useRepositorySelection();

  if (repositories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
          No repositories found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 gap-4">
        {repositories.map(repository => (
          <button
            key={repository.id}
            onClick={() => handleRepositorySelect(repository)}
            className="flex flex-col gap-2 p-4 rounded-lg border text-left transition-colors hover:bg-gray-500/5"
            style={{ borderColor: theme.colors.border.primary }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: theme.colors.text.primary }}>
                {repository.owner}/{repository.name}
              </span>
              {repository.visibility === 'private' && (
                <span
                  className="px-2 py-1 text-xs rounded-full"
                  style={{
                    backgroundColor: theme.colors.background.primary,
                    color: theme.colors.text.secondary
                  }}
                >
                  Private
                </span>
              )}
            </div>
            {repository.description && (
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                {repository.description}
              </p>
            )}
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                ★ {repository.stargazersCount.toLocaleString()}
              </span>
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                🔀 {repository.forksCount.toLocaleString()}
              </span>
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                ⚠️ {repository.openIssuesCount.toLocaleString()}
              </span>
            </div>
            {repository.lastAnalysisTimestamp && (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: theme.colors.success.primary }}
                />
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  Last analyzed: {new Date(repository.lastAnalysisTimestamp).toLocaleString()}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
