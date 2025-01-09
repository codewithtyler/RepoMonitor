import { useRepositoriesData } from '../lib/hooks/use-repository-data';
import { GlobalStatsCard } from '../components/common/global-stats-card';
import { RecentRepositoriesCard } from '../components/repository/recent-repositories-card';
import { Loader2 } from 'lucide-react';
import { getAuthState } from '../lib/auth/global-state';
import { HeaderLogo } from '../components/layout/header-logo';
import { NotificationDropdown } from '../components/common/notification-dropdown';
import { SearchBar } from '../components/search/search-bar';
import { UserProfile } from '../components/common/user-profile';
import { theme } from '../config/theme';

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

    const content = (
      <div className="flex flex-col h-screen w-full" style={{ backgroundColor: theme.colors.background.primary }}>
        {/* Navbar */}
        <header className="border-b" style={{ borderColor: theme.colors.border.primary }}>
          <div className="flex items-center justify-between px-4 h-14">
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

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 flex flex-col border-r" style={{ borderColor: theme.colors.border.primary }}>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-medium mb-2" style={{ color: theme.colors.text.secondary }}>Recently Tracked</h2>
                  {repositories.length === 0 ? (
                    <p className="text-sm" style={{ color: theme.colors.text.secondary }}>No repositories tracked yet</p>
                  ) : (
                    <div className="space-y-1">
                      {repositories.slice(0, 5).map(repo => (
                        <div
                          key={repo.id}
                          className="px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                          style={{ backgroundColor: theme.colors.background.secondary }}
                        >
                          <p className="text-sm truncate" style={{ color: theme.colors.brand.secondary }}>{repo.owner}/{repo.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2" style={{ color: theme.colors.text.secondary }}>Recently Analyzed</h2>
                  {repositories.filter(r => r.lastAnalysisTimestamp).length === 0 ? (
                    <p className="text-sm" style={{ color: theme.colors.text.secondary }}>No repositories analyzed yet</p>
                  ) : (
                    <div className="space-y-1">
                      {repositories
                        .filter(r => r.lastAnalysisTimestamp)
                        .sort((a, b) => new Date(b.lastAnalysisTimestamp!).getTime() - new Date(a.lastAnalysisTimestamp!).getTime())
                        .slice(0, 5)
                        .map(repo => (
                          <div
                            key={repo.id}
                            className="px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                            style={{ backgroundColor: theme.colors.background.secondary }}
                          >
                            <p className="text-sm truncate" style={{ color: theme.colors.brand.secondary }}>{repo.owner}/{repo.name}</p>
                            <p className="text-xs truncate mt-1" style={{ color: theme.colors.text.secondary }}>
                              Last analyzed: Never
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4">
              <GlobalStatsCard repositories={repositories} />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <h2 className="text-lg font-medium mb-4" style={{ color: theme.colors.text.primary }}>Recent Repositories</h2>
              <RecentRepositoriesCard repositories={repositories} />
            </div>
          </div>
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
