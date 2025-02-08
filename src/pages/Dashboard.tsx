import { useState } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import type { Repository } from '@/lib/hooks/use-repository-data';
import type { SearchResult } from '@/lib/contexts/search-context';
import { RepositoryList } from '@/components/repository/repository-list';
import { SearchBar } from '@/components/search/search-bar';
import { HeaderLogo } from '@/components/layout/header-logo';
import { useRepositoriesData } from '@/lib/hooks/use-repository-data';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { RepositoryDetailView } from '@/components/repository/repository-detail-view';
import { NotificationDropdown } from '@/components/common/notification-dropdown';
import { UserProfile } from '@/components/common/user-profile';
import { GitHubLoginButton } from '@/components/auth/github-login-button';
import { OpenWithModal } from '@/components/repository/open-with-modal';
import { ExternalLink } from 'lucide-react';
import { useTrackedRepositories } from '@/lib/hooks/use-tracked-repositories';

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading, error } = useRepositoriesData();
  const { data: trackedRepositoriesData } = useTrackedRepositories();
  const trackedRepositories = trackedRepositoriesData?.repositories || [];
  const { selectedRepository, recentlyAnalyzed, selectRepository } = useAnalysis() as {
    selectedRepository: Repository | null;
    recentlyAnalyzed: Repository[];
    selectRepository: (repo: Repository | SearchResult | null) => void;
  };
  const [isOpenWithModalVisible, setIsOpenWithModalVisible] = useState(false);

  const handleRepositorySelect = (repository: Repository | SearchResult) => {
    selectRepository(repository);
  };

  const handleOpenWith = () => {
    setIsOpenWithModalVisible(true);
  };

  // Show login screen if no user
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9]">
        <header className="h-14 border-b border-[#30363d]">
          <div className="flex items-center justify-between px-4 h-full">
            <div className="w-48">
              <HeaderLogo />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-6">Welcome to RepoMonitor</h2>
            <p className="text-[#8b949e] mb-8">Sign in with GitHub to get started</p>
            <GitHubLoginButton />
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9]">
        <header className="h-14 border-b border-[#30363d]">
          <div className="flex items-center justify-between px-4 h-full">
            <div className="w-48">
              <HeaderLogo />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8b949e] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9]">
        <header className="h-14 border-b border-[#30363d]">
          <div className="flex items-center justify-between px-4 h-full">
            <div className="w-48">
              <HeaderLogo />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-md">
                <SearchBar className="rounded-lg" />
              </div>
            </div>
            <div className="w-48 flex items-center justify-end gap-4">
              <NotificationDropdown />
              <UserProfile />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8b949e] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9]">
        <header className="h-14 border-b border-[#30363d]">
          <div className="flex items-center justify-between px-4 h-full">
            <div className="w-48">
              <HeaderLogo />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-md">
                <SearchBar className="rounded-lg" />
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
            <h2 className="text-lg font-medium mb-2">Error Loading Repositories</h2>
            <p className="text-[#f85149]">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate open issues count only for tracked repositories
  const openIssuesCount = trackedRepositories.reduce((total, repo) => total + (repo.openIssuesCount || 0), 0);

  const stats = [
    {
      title: 'Repositories',
      value: trackedRepositories.length,
      description: 'Total number of tracked repositories',
      layoutOrder: 1
    },
    {
      title: 'Open Issues',
      value: openIssuesCount,
      description: 'Across all tracked repositories',
      layoutOrder: 2
    },
    {
      title: 'Analyzed Repositories',
      value: recentlyAnalyzed.length,
      description: 'Repositories that have been analyzed',
      layoutOrder: 3
    },
    {
      title: 'Active Analysis',
      value: selectedRepository ? 1 : 0,
      description: 'Currently analyzing repository',
      layoutOrder: 4
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9]">
      <header className="h-14 border-b border-[#30363d]">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="w-48">
            <HeaderLogo />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-md">
              <SearchBar className="rounded-lg" />
            </div>
          </div>
          <div className="w-48 flex items-center justify-end gap-4">
            <NotificationDropdown />
            <UserProfile />
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-[#30363d] flex-shrink-0 min-h-full bg-[#0d1117]">
          <div className="p-4 space-y-6">
            {/* Tracked Repositories Section */}
            <div>
              <h2 className="text-sm font-medium mb-3 text-[#8b949e]">
                Tracked Repositories
              </h2>
              <div className="space-y-1">
                {trackedRepositories.length > 0 ? (
                  trackedRepositories.map(repo => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepositorySelect(repo)}
                      className="w-full px-2 py-1 text-left rounded-lg hover:bg-[#21262d] transition-colors text-[#8b949e]"
                    >
                      <span className="text-sm truncate block">
                        {repo.owner}/{repo.name}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm text-[#8b949e]">
                    No tracked repositories yet
                  </div>
                )}
              </div>
            </div>

            {/* Recently Analyzed Section */}
            <div>
              <h2 className="text-sm font-medium mb-3 text-[#8b949e]">
                Recently Analyzed
              </h2>
              <div className="space-y-1">
                {recentlyAnalyzed && recentlyAnalyzed.length > 0 ? (
                  recentlyAnalyzed.map(repo => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepositorySelect(repo)}
                      className="w-full px-2 py-1 text-left rounded-lg hover:bg-[#21262d] transition-colors text-[#8b949e]"
                    >
                      <span className="text-sm truncate block">
                        {repo.owner}/{repo.name}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm text-[#8b949e]">
                    No repositories have been analyzed yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {selectedRepository ? (
              <RepositoryDetailView
                repository={selectedRepository}
                onBack={() => selectRepository(null)}
              />
            ) : (
              <>
                {/* Stats Grid for Dashboard View */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
                  {stats.map((stat) => (
                    <div
                      key={stat.title}
                      className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]"
                    >
                      <h3 className="text-sm font-medium text-[#8b949e]">{stat.title}</h3>
                      <p className="text-2xl font-bold mt-1 text-[#c9d1d9]">{stat.value}</p>
                      <p className="text-sm text-[#8b949e] mt-1">{stat.description}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">
                      Recently Analyzed Repositories
                    </h2>
                  </div>
                  {recentlyAnalyzed && recentlyAnalyzed.length > 0 ? (
                    <div className="w-full">
                      <RepositoryList
                        repositories={recentlyAnalyzed as Repository[]}
                        onSelect={handleRepositorySelect}
                      />
                    </div>
                  ) : (
                    <div className="px-2 py-1 text-sm text-[#8b949e]">
                      No repositories have been analyzed yet
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Only shows when repo is selected */}
      <div
        className={`${selectedRepository ? 'w-96 opacity-100' : 'w-0 opacity-0'
          } border-l flex-shrink-0 transition-all duration-300 overflow-hidden`}
        style={{ borderColor: '#30363d' }}
      >
        <div className="p-4 space-y-4">
          {/* Action Buttons */}
          <div className="space-y-2">
            {selectedRepository && (
              <button
                onClick={handleOpenWith}
                className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2ea043] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open With...
              </button>
            )}
          </div>

          {/* Stats Grid for Analysis View */}
          <div className="grid grid-cols-1 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="p-4 rounded-lg bg-[#21262d] border border-[#30363d] transition-all duration-300"
              >
                <h3 className="text-sm font-medium text-[#8b949e]">{stat.title}</h3>
                <p className="text-2xl font-bold mt-1 text-[#c9d1d9]">{stat.value}</p>
                <p className="text-sm text-[#8b949e] mt-1">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open With Modal */}
      {selectedRepository && (
        <OpenWithModal
          isOpen={isOpenWithModalVisible}
          onClose={() => setIsOpenWithModalVisible(false)}
          repositoryUrl={`${selectedRepository.owner}/${selectedRepository.name}`}
        />
      )}
    </div>
  );
}
