import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositoriesData, type Repository } from '@/lib/hooks/use-repository-data';
import { GlobalStatsCard } from '@/components/common/global-stats-card';
import { RepositoryList } from '@/components/repository/repository-list';
import { SearchBar } from '@/components/search/search-bar';
import { theme } from '@/config/theme';

export function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: repositories, isLoading, error } = useRepositoriesData();

  const filteredRepositories = repositories?.filter(repo => {
    const searchLower = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(searchLower) ||
      repo.owner.toLowerCase().includes(searchLower) ||
      (repo.description?.toLowerCase() || '').includes(searchLower)
    );
  });

  const handleRepositorySelect = (repository: Repository) => {
    navigate(`/analyze/${repository.owner}/${repository.name}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.colors.background.primary }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: theme.colors.text.secondary, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.colors.background.primary }}>
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2" style={{ color: theme.colors.text.primary }}>Error Loading Repositories</h2>
          <p style={{ color: theme.colors.error.primary }}>{error.message}</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Repositories',
      value: repositories?.length || 0,
      description: 'Number of repositories you have access to',
      layoutOrder: 0
    },
    {
      title: 'Analyzed Repositories',
      value: repositories?.filter(repo => repo.lastAnalysisTimestamp).length || 0,
      description: 'Number of repositories that have been analyzed',
      layoutOrder: 1
    },
    {
      title: 'Total Issues',
      value: repositories?.reduce((sum, repo) => sum + repo.openIssuesCount, 0) || 0,
      description: 'Total number of open issues across all repositories',
      layoutOrder: 2
    }
  ];

  const recentlyAnalyzed = repositories
    ?.filter(repo => repo.lastAnalysisTimestamp)
    .sort((a, b) => {
      const dateA = new Date(a.lastAnalysisTimestamp!);
      const dateB = new Date(b.lastAnalysisTimestamp!);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: theme.colors.background.primary }}>
      {/* Left Sidebar */}
      <div className="w-64 border-r flex-shrink-0" style={{ borderColor: theme.colors.border.primary }}>
        <div className="p-4 space-y-6">
          <div>
            <h2 className="text-sm font-medium mb-3" style={{ color: theme.colors.text.secondary }}>
              Favorite Repositories
            </h2>
            <div className="space-y-1">
              <div className="px-2 py-1 text-sm" style={{ color: theme.colors.text.secondary }}>
                No favorite repositories yet
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium mb-3" style={{ color: theme.colors.text.secondary }}>
              Recently Analyzed
            </h2>
            <div className="space-y-1">
              {recentlyAnalyzed && recentlyAnalyzed.length > 0 ? (
                recentlyAnalyzed.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepositorySelect(repo)}
                    className="w-full px-2 py-1 text-left rounded hover:bg-gray-500/5 transition-colors"
                  >
                    <span className="text-sm truncate block" style={{ color: theme.colors.text.secondary }}>
                      {repo.owner}/{repo.name}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-1 text-sm" style={{ color: theme.colors.text.secondary }}>
                  No repositories analyzed yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              Dashboard
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <GlobalStatsCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                description={stat.description}
                layoutOrder={stat.layoutOrder}
              />
            ))}
          </div>

          <div className="space-y-4">
            <SearchBar
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={setSearchQuery}
              autoFocus
            />

            <RepositoryList
              repositories={filteredRepositories || []}
              onSelect={handleRepositorySelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
