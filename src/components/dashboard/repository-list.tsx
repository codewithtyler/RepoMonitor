import { type Repository } from '@/lib/hooks/use-repository-data';
import { theme } from '@/config/theme';

interface RepositoryListProps {
    repositories: Repository[];
    onSelect?: (repository: Repository) => void;
}

export function RepositoryList({ repositories, onSelect }: RepositoryListProps) {
    const handleRepositoryClick = (repository: Repository) => {
        console.log('[RepositoryList] Repository clicked:', repository.owner, repository.name);
        onSelect?.(repository);
    };

    return (
        <div className="grid gap-4">
            {repositories.map((repository) => (
                <button
                    key={repository.id}
                    onClick={() => handleRepositoryClick(repository)}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-500/5"
                    style={{
                        backgroundColor: theme.colors.background.secondary,
                        borderColor: theme.colors.border.primary
                    }}
                >
                    <div className="flex flex-col">
                        <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
                            {repository.owner}/{repository.name}
                        </span>
                        <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                            {repository.description || 'No description'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
                            ⭐ {repository.stargazersCount}
                        </div>
                        <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
                            🔄 {repository.forksCount}
                        </div>
                        <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
                            ⚠️ {repository.openIssuesCount}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    )
}
