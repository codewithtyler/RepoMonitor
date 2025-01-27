import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositoriesData, type Repository } from '@/lib/hooks/use-repository-data';
import { GlobalStatsCard } from '@/components/common/global-stats-card';
import { RepositoryList } from '@/components/repository/repository-list';
import { SearchBar } from '@/components/search/search-bar';
import { HeaderLogo } from '@/components/layout/header-logo';
import { NotificationDropdown } from '@/components/common/notification-dropdown';
import { UserProfile } from '@/components/common/user-profile';
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
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.colors.background.primary }}>
        {/* Fixed Header/Navbar */}
        <header className="h-14 border-b" style={{ borderColor: theme.colors.border.primary }}>
          <div className="flex items-center justify-between px-4 h-full">
            <div className="w-48">
              <HeaderLogo />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-md">
                <SearchBar
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  autoFocus
                />
              </div>
            </div>
            <div className="w-48 flex items-center justify-end gap-4">
              <NotificationDropdown />
              <UserProfile />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: theme.colors.text.secondary, borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.colors.background.primary }}>
        {/* Fixed Header/Navbar */}
        <header className="h-14 border-b" style={{ borderColor: theme.colors.border.primary }}>
          <div className="flex items-center justify-between px-4 h-full">
            <div className="w-48">
              <HeaderLogo />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-md">
                <SearchBar
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  autoFocus
                />
              </div>
            </div>
            <div className="w-48 flex items-center justify-end gap-4">
              <NotificationDropdown />
              <UserProfile />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-medium mb-2" style={{ color: theme.colors.text.primary }}>Error Loading Repositories</h2>
            <p style={{ color: theme.colors.error.primary }}>{error.message}</p>
          </div>
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.colors.background.primary }}>
      {/* Fixed Header/Navbar */}
      <header className="h-14 border-b" style={{ borderColor: theme.colors.border.primary }}>
        <div className="flex items-center justify-between px-4 h-full">
          <div className="w-48">
            <HeaderLogo />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-md">
              <SearchBar
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={setSearchQuery}
                autoFocus
              />
            </div>
          </div>
          <div className="w-48 flex items-center justify-end gap-4">
            <NotificationDropdown />
            <UserProfile />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
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

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
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
              <RepositoryList
                repositories={filteredRepositories || []}
                onSelect={handleRepositorySelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
