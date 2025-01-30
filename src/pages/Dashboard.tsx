import { useState, useEffect } from 'react';
import { useRepositoriesData, type Repository } from '@/lib/hooks/use-repository-data';
import { type SearchResult } from '@/lib/contexts/search-context';
import { GlobalStatsCard } from '@/components/common/global-stats-card';
import { RepositoryList } from '@/components/repository/repository-list';
import { SearchBar } from '@/components/search/search-bar';
import { HeaderLogo } from '@/components/layout/header-logo';
import { NotificationDropdown } from '@/components/common/notification-dropdown';
import { UserProfile } from '@/components/common/user-profile';
import { RepositoryDetailView } from '@/components/repository/repository-detail-view';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { useGitHub } from '@/lib/contexts/github-context';
import type { GitHubContextType } from '@/lib/contexts/github-context';
import { supabase } from '@/lib/auth/supabase-client';
import { toast } from '@/hooks/use-toast';
import { ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { GitHubClient } from '@/lib/github';
import { ActiveAnalysisGlobalCard } from '@/components/analysis/active-analysis-global-card';
import { useActiveAnalyses } from '@/lib/contexts/active-analyses-context';
import { OpenWithModal } from '@/components/repository/open-with-modal';
import { useAuth } from '@/lib/contexts/auth-context';
import { GitHubLoginButton } from '@/components/auth/github-login-button';

interface Stats {
  title: string;
  value: string | number;
  description: string;
  layoutOrder: number;
}

export const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: repositories, isLoading, error } = useRepositoriesData();
  const { selectedRepository, recentlyAnalyzed, selectRepository } = useAnalysis() as {
    selectedRepository: Repository | null;
    recentlyAnalyzed: Repository[];
    selectRepository: (repo: Repository | SearchResult) => void;
  };
  const { withGitHub } = useGitHub() as GitHubContextType;
  const queryClient = useQueryClient();
  useActiveAnalyses();
  const [trackedRepositories, setTrackedRepositories] = useState<Repository[]>([]);
  const [isOpenWithModalVisible, setIsOpenWithModalVisible] = useState(false);

  // Load tracked repositories from localStorage
  useEffect(() => {
    const loadTrackedRepos = () => {
      const tracked = JSON.parse(localStorage.getItem('trackedRepositories') || '[]');
      setTrackedRepositories(tracked);
    };

    loadTrackedRepos();
    window.addEventListener('storage', loadTrackedRepos);
    return () => window.removeEventListener('storage', loadTrackedRepos);
  }, []);

  const handleRepositorySelect = (repository: Repository | SearchResult) => {
    selectRepository(repository);
  };

  const handleStartAnalysis = async () => {
    if (!selectedRepository) return;
    try {
      // Implement analysis logic here
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
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
                <SearchBar />
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
                <SearchBar />
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

  const stats = [
    {
      title: 'Total Repositories',
      value: parseInt(localStorage.getItem('totalRepositories') || '0'),
      description: 'Total number of tracked repositories',
      layoutOrder: 1
    },
    {
      title: 'Open Issues',
      value: repositories?.reduce((total, repo) => total + (repo.openIssuesCount || 0), 0) || 0,
      description: 'Across all tracked repositories',
      layoutOrder: 2
    },
    {
      title: 'Analyzed Repositories',
      value: recentlyAnalyzed.length,
      description: 'Repositories that have been analyzed',
      layoutOrder: 3
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
              <SearchBar />
            </div>
          </div>
          <div className="w-48 flex items-center justify-end gap-4">
            <NotificationDropdown />
            <UserProfile />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-[#30363d] flex-shrink-0">
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
                      className="w-full px-2 py-1 text-left rounded hover:bg-[#21262d] transition-colors text-[#8b949e]"
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
                      className="w-full px-2 py-1 text-left rounded hover:bg-[#21262d] transition-colors text-[#8b949e]"
                    >
                      <span className="text-sm truncate block">
                        {repo.owner}/{repo.name}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm text-[#8b949e]">
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
            {selectedRepository ? (
              <RepositoryDetailView
                owner={selectedRepository.owner}
                name={selectedRepository.name}
              />
            ) : (
              <>
                {/* Global Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {stats.map((stat, index) => (
                    <GlobalStatsCard
                      key={index}
                      {...stat}
                    />
                  ))}
                  <ActiveAnalysisGlobalCard />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">
                      Recently Analyzed Repositories
                    </h2>
                  </div>
                  {recentlyAnalyzed && recentlyAnalyzed.length > 0 ? (
                    <RepositoryList repositories={recentlyAnalyzed as Repository[]} />
                  ) : (
                    <div className="p-4 rounded-lg text-center">
                      <p>
                        No repositories have been analyzed yet
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Only shows when repo is selected */}
        <div
          className={`${selectedRepository ? 'w-80 opacity-100' : 'w-0 opacity-0'} border-l flex-shrink-0 transition-all duration-300 overflow-hidden`}
          style={{ borderColor: '#30363d' }}
        >
          <div className="p-4 space-y-4">
            {/* Action Buttons */}
            <div className="space-y-2">
              {selectedRepository && (
                <button
                  onClick={() => setIsOpenWithModalVisible(true)}
                  className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2ea043] transition-colors min-w-[200px]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open With...
                </button>
              )}
            </div>

            {/* Open With Modal */}
            {selectedRepository && (
              <OpenWithModal
                isOpen={isOpenWithModalVisible}
                onClose={() => setIsOpenWithModalVisible(false)}
                repositoryUrl={`${selectedRepository.owner}/${selectedRepository.name}`}
              />
            )}

            <h2 className="text-sm font-medium">
              Global Stats
            </h2>
            {stats.map((stat: Stats, index: number) => (
              <GlobalStatsCard
                key={index}
                {...stat}
              />
            ))}
            <ActiveAnalysisGlobalCard />
          </div>
        </div>
      </div>
    </div>
  );
}

