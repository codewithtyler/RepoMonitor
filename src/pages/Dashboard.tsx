import { useState } from 'react';
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
import { theme } from '@/config/theme';
import { useTrackedRepositories } from '@/lib/hooks/use-tracked-repositories';
import { useGitHub } from '@/lib/hooks/use-github';
import { supabase } from '@/lib/auth/supabase-client';
import { toast } from '@/hooks/use-toast';
import { ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { GitHubClient } from '@/lib/github';
import { ActiveAnalysisGlobalCard } from '@/components/analysis/active-analysis-global-card';
import { useActiveAnalyses } from '@/lib/contexts/active-analyses-context';
import { RepositoryActionModal } from '../components/search/repository-action-modal';

interface Stats {
  title: string;
  value: string | number;
  description: string;
  layoutOrder: number;
}

export function Dashboard() {
  const { data: repositories, isLoading, error } = useRepositoriesData();
  const { selectedRepository, recentlyAnalyzed, selectRepository } = useAnalysis() as {
    selectedRepository: Repository | null;
    recentlyAnalyzed: Repository[];
    selectRepository: (repo: Repository | SearchResult) => void;
  };
  const { data: trackedData } = useTrackedRepositories();
  const { withGitHub } = useGitHub();
  const queryClient = useQueryClient();
  const { activeCount } = useActiveAnalyses() as { activeCount: number };
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRepositorySelect = (repository: Repository | SearchResult) => {
    selectRepository(repository);
  };

  const handleTrackRepository = async () => {
    if (!selectedRepository) return;

    try {
      // Check if we have access and get permissions
      const access = await withGitHub((client: GitHubClient) =>
        client.getRepository(selectedRepository.owner, selectedRepository.name)
      );

      if (!access) {
        toast({
          title: 'Access Error',
          description: 'You no longer have access to this repository.',
          variant: 'destructive'
        });
        return;
      }

      // Add repository to tracking
      const { error } = await supabase
        .from('repositories')
        .upsert({
          github_id: access.id,
          name: selectedRepository.name,
          owner: selectedRepository.owner,
          repository_permissions: access.permissions,
          last_analysis_timestamp: null,
          analyzed_by_user_id: null,
          is_public: access.visibility === 'public'
        });

      if (error) throw error;

      toast({
        title: 'Repository Added',
        description: `Now tracking ${selectedRepository.owner}/${selectedRepository.name}`,
      });

      // Refetch tracked repositories to update the count
      await queryClient.invalidateQueries({ queryKey: ['tracked-repositories'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to track repository. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedRepository) return;
    try {
      // Implement analysis logic here
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
  };

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
      value: trackedData?.count || 0,
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
                {trackedData?.repositories && trackedData.repositories.length > 0 ? (
                  trackedData.repositories.map(repo => (
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
                      title={stat.title}
                      value={stat.value}
                      description={stat.description}
                      layoutOrder={stat.layoutOrder}
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
                    <RepositoryList repositories={recentlyAnalyzed} />
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
        >
          <div className="p-4 space-y-4">
            {/* Track Repository Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors hover:opacity-80"
              style={{ backgroundColor: '#238636', color: '#ffffff' }}
            >
              <ExternalLink className="h-4 w-4" />
              Open With...
            </button>

            {selectedRepository && (
              <RepositoryActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onTrack={handleTrackRepository}
                onAnalyze={handleStartAnalysis}
                repository={selectedRepository}
              />
            )}

            <h2 className="text-sm font-medium">
              Global Stats
            </h2>
            {stats.map((stat: Stats, index: number) => (
              <GlobalStatsCard
                key={index}
                title={stat.title}
                value={stat.value}
                description={stat.description}
                layoutOrder={stat.layoutOrder}
              />
            ))}
            <ActiveAnalysisGlobalCard />
          </div>
        </div>
      </div>
    </div>
  );
}

