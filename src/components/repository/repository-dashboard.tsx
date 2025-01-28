import { useNavigate } from 'react-router-dom';
import { useRepositoriesData, type Repository } from '@/lib/hooks/use-repository-data';
import { theme } from '@/config/theme';

export function RepositoryDashboard() {
  const navigate = useNavigate();
  const { data: repositories, isLoading, error } = useRepositoriesData();

  if (isLoading) {
    return (
      <div className="p-4" style={{ color: theme.colors.text.primary }}>
        Loading repositories...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4" style={{ color: theme.colors.text.error }}>
        Error loading repositories: {error.message}
      </div>
    );
  }

  const handleRepositoryClick = (repository: Repository) => {
    navigate(`/repository/${repository.owner}/${repository.name}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {repositories?.map((repository) => (
        <button
          key={repository.id}
          onClick={() => handleRepositoryClick(repository)}
          className="p-6 rounded-lg text-left hover:bg-opacity-90 transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
          }}
        >
          <h3 className="text-lg font-semibold mb-2">
            {repository.owner}/{repository.name}
          </h3>
          {repository.description && (
            <p className="text-sm mb-4 line-clamp-2" style={{ color: theme.colors.text.secondary }}>
              {repository.description}
            </p>
          )}
          <div className="flex items-center gap-6 text-sm" style={{ color: theme.colors.text.secondary }}>
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">★</span> {repository.stargazersCount}
            </span>
            <span className="flex items-center gap-1">
              <span>🔄</span> {repository.forksCount}
            </span>
            <span className="flex items-center gap-1">
              <span>⚠️</span> {repository.openIssuesCount}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
