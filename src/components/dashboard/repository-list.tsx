import { useRepositoriesData } from '@/lib/hooks/use-repository-data';
import { Repository } from '@/types/repository';

interface RepositoryListProps {
    repositories: Repository[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
    const { refreshRepositoryData } = useRepositoriesData();

    const handleRepositoryClick = async (repository: Repository) => {
        console.log('[RepositoryList] Repository clicked:', repository.owner, repository.name);
        try {
            await refreshRepositoryData(repository.owner, repository.name);
        } catch (error) {
            console.error('[RepositoryList] Error refreshing repository data:', error);
        }
    };

    return (
        <div className="grid gap-4">
            {repositories.map((repository) => (
                <button
                    key={repository.id}
                    onClick={() => handleRepositoryClick(repository)}
                    className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                            {repository.owner}/{repository.name}
                        </span>
                        <span className="text-sm text-gray-500">
                            {repository.description || 'No description'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500">
                            ⭐ {repository.stargazersCount}
                        </div>
                        <div className="text-sm text-gray-500">
                            🔄 {repository.forksCount}
                        </div>
                        <div className="text-sm text-gray-500">
                            ⚠️ {repository.openIssuesCount}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    )
}
