import { useRepositoriesData } from '../lib/hooks/use-repository-data';
import { GlobalStatsCard } from '../components/common/global-stats-card';
import { RecentlyAnalyzedCard } from '../components/repository/recently-analyzed-card';
import { Loader2, Github, GitPullRequest, GitMerge, GitBranch, AlertCircle } from 'lucide-react';
import { getAuthState } from '../lib/auth/global-state';
import { HeaderLogo } from '../components/layout/header-logo';
import { NotificationDropdown } from '../components/common/notification-dropdown';
import { SearchBar } from '../components/search/search-bar';
import { UserProfile } from '../components/common/user-profile';
import { theme } from '../config/theme';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { RepoStatsCard } from '../components/common/repo-stats-card';
import { motion } from 'framer-motion';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

interface DashboardStats {
  trackedRepos: number;
  analyzedRepos: number;
  openIssues: number;
  activeAutomations: number;
}

function DashboardContent() {
  console.log('[Dashboard/Content] Starting render');

  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);

  try {
    console.log('[Dashboard/Content] Getting auth state');
    const { user } = getAuthState();
    console.log('[Dashboard/Content] Auth state:', { hasUser: !!user, userId: user?.id });

    console.log('[Dashboard/Content] About to call useRepositoriesData');
    const { repositories, isLoading, error } = useRepositoriesData();
    console.log('[Dashboard/Content] useRepositoriesData returned:', {
      hasRepositories: !!repositories,
      repositoryCount: repositories?.length,
      isLoading,
      hasError: !!error
    });

    if (error) {
      console.error('[Dashboard/Content] Error from useRepositoriesData:', error);
      throw error;
    }

    if (isLoading) {
      console.log('[Dashboard/Content] Rendering loading state');
      return (
        <div className="flex items-center justify-center h-screen" style={{ backgroundColor: theme.colors.background.primary }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.text.secondary }} />
        </div>
      );
    }

    if (!repositories) {
      console.log('[Dashboard/Content] No repositories found');
      return (
        <div className="flex items-center justify-center h-screen" style={{ backgroundColor: theme.colors.background.primary }}>
          <div className="text-center" style={{ color: theme.colors.text.secondary }}>
            No repositories found.
          </div>
        </div>
      );
    }

    console.log('[Dashboard/Content] About to render dashboard with repositories:', repositories.length);

    const handleRepoClick = (owner: string, name: string) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setSelectedRepo({ owner, name });
      setTimeout(() => {
        setIsAnimating(false);
      }, 800);
    };

    const content = (
      <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: theme.colors.background.primary }}>
        {/* Navbar - Fixed height */}
        <header className="h-14 border-b" style={{ borderColor: theme.colors.border.primary }}>
          <div className="flex items-center justify-between px-4 h-full">
            <div className="flex items-center gap-4 flex-1">
              <HeaderLogo />
              <SearchBar />
            </div>
            <div className="flex items-center gap-4">
              <NotificationDropdown />
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Main Content - Takes remaining height */}
        <div className="flex-1 flex">
          {/* Left Sidebar */}
          <div className="w-[300px] border-r" style={{ borderColor: theme.colors.border.primary }}>
            <div className="h-full p-4">
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-medium mb-2" style={{ color: theme.colors.text.secondary }}>Favorite Repositories</h2>
                  <p className="text-sm px-3" style={{ color: theme.colors.text.secondary }}>No favorite repositories yet</p>
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2" style={{ color: theme.colors.text.secondary }}>Recently Tracked</h2>
                  {repositories.length === 0 ? (
                    <p className="text-sm" style={{ color: theme.colors.text.secondary }}>No repositories tracked yet</p>
                  ) : (
                    <div className="space-y-1">
                      {repositories.slice(0, 10).map(repo => (
                        <div
                          key={repo.id}
                          onClick={() => handleRepoClick(repo.owner, repo.name)}
                          className="px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-500/5 transition-colors flex items-center gap-2"
                        >
                          <Github className="w-4 h-4" style={{ color: theme.colors.text.secondary }} />
                          <p className="text-sm truncate" style={{ color: theme.colors.text.secondary }}>{repo.owner}/{repo.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Content */}
          <div className="flex-1">
            <div className="h-full p-4">
              <AnimatePresence mode="popLayout">
                {!selectedRepo ? (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 1 }}
                  >
                    <GlobalStatsCard
                      repositories={repositories}
                      variant={selectedRepo ? 'compact' : 'default'}
                      layoutOrder={['trackedRepos', 'analyzedRepos', 'openIssues', 'activeAutomations']}
                    />
                    {repositories.filter(r => r.lastAnalysisTimestamp).length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h2 className="text-lg font-medium mb-4 mt-6" style={{ color: theme.colors.text.primary }}>Recently Analyzed</h2>
                        <RecentlyAnalyzedCard
                          repositories={repositories
                            .filter(r => r.lastAnalysisTimestamp)
                            .sort((a, b) => new Date(b.lastAnalysisTimestamp!).getTime() - new Date(a.lastAnalysisTimestamp!).getTime())
                          }
                        />
                      </motion.div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="h-[200px]" /> {/* Spacer to push content down */}
                        <div className="flex flex-col items-center justify-center text-center">
                          <h3 className="text-xl font-medium mb-2" style={{ color: theme.colors.text.primary }}>No Analyzed Repositories Yet</h3>
                          <p className="text-sm max-w-md" style={{ color: theme.colors.text.secondary }}>
                            Select a repository from the sidebar and click "Start Analysis" to begin finding potential duplicate issues.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
                            {selectedRepo.owner}/{selectedRepo.name}
                          </h2>
                          <button
                            onClick={() => setSelectedRepo(null)}
                            className="text-sm hover:underline"
                            style={{ color: theme.colors.text.secondary }}
                          >
                            ← Back to Dashboard
                          </button>
                        </div>

                        {/* Repository Stats Cards */}
                        <div className="grid grid-cols-4 gap-4 mt-6">
                          <RepoStatsCard
                            layoutId="repo-stats-open-issues"
                            id="openIssues"
                            title="Open Issues"
                            value={repositories.find(r => r.owner === selectedRepo.owner && r.name === selectedRepo.name)?.openIssuesCount?.toString() || '0'}
                            description="Total open issues"
                            icon={GitPullRequest}
                          />
                          <RepoStatsCard
                            layoutId="repo-stats-duplicate-issues"
                            id="duplicateIssues"
                            title="Duplicate Issues - Coming Soon™"
                            value="0"
                            description="From last analysis"
                            icon={GitMerge}
                          />
                          <RepoStatsCard
                            layoutId="repo-stats-estimated-duplicates"
                            id="estimatedDuplicates"
                            title="Est. Duplicates - Coming Soon™"
                            value="0"
                            description="Based on historical trends"
                            icon={GitBranch}
                          />
                          <RepoStatsCard
                            layoutId="repo-stats-average-age"
                            id="averageIssues"
                            title="Average Age - Coming Soon™"
                            value="0"
                            description="Per open issue"
                            icon={AlertCircle}
                          />
                        </div>

                        {/* Issue Analysis Section */}
                        <div className="space-y-4 mt-6">
                          <div>
                            <h3 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
                              Issue Analysis
                            </h3>
                            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                              Analysis in progress - please do not close this window
                              <span className="ml-1 opacity-75">(Started about 1 hour ago)</span>
                            </p>
                          </div>

                          <div className="space-y-4">
                            {/* Stage 1 */}
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-xs text-white">100%</span>
                              </div>
                              <div>
                                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>Stage 1: Data Collection</h4>
                                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>Fetching issues from GitHub repository</p>
                                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>Fetched 13 issues</p>
                              </div>
                            </div>

                            {/* Stage 2 */}
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full border-2 border-gray-700" />
                              <div>
                                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>Stage 2: Processing Issues</h4>
                                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>Generating embeddings for similarity detection</p>
                              </div>
                            </div>

                            {/* Stage 3 */}
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full border-2 border-gray-700" />
                              <div>
                                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>Stage 3: Analyzing Issues</h4>
                                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>Searching for potential duplicates</p>
                              </div>
                            </div>

                            {/* Stage 4 */}
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full border-2 border-gray-700" />
                              <div>
                                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>Stage 4: Generating Report</h4>
                                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>Preparing analysis results</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Sidebar - Only shown when a repo is selected */}
          <AnimatePresence>
            {selectedRepo && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-[300px] border-l"
                style={{ borderColor: theme.colors.border.primary }}
              >
                <div className="h-full p-4">
                  <div className="space-y-4">
                    <GlobalStatsCard
                      repositories={repositories}
                      variant="compact"
                      layoutOrder={['trackedRepos', 'analyzedRepos', 'openIssues', 'activeAutomations']}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );

    console.log('[Dashboard/Content] Successfully created content');
    return content;
  } catch (error) {
    console.error('[Dashboard/Content] Error during render:', error);
    if (error instanceof Error) {
      console.error('[Dashboard/Content] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

export function Dashboard() {
  console.log('[Dashboard] Starting render');
  try {
    console.log('[Dashboard] About to render content');
    const content = <DashboardContent />;
    console.log('[Dashboard] Successfully created content');
    return content;
  } catch (error) {
    console.error('[Dashboard] Error during render:', error);
    if (error instanceof Error) {
      console.error('[Dashboard] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}
