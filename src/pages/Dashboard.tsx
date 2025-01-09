import { useRepositoriesData } from '../lib/hooks/use-repository-data';
import { GlobalStatsCard } from '../components/common/global-stats-card';
import { RecentRepositoriesCard } from '../components/repository/recent-repositories-card';
import { Loader2 } from 'lucide-react';
import { getAuthState } from '../lib/auth/global-state';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense, useEffect, useState } from 'react';

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
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (!repositories) {
      console.log('[Dashboard/Content] No repositories found');
      return <div>No repositories found.</div>;
    }

    console.log('[Dashboard/Content] About to render dashboard with repositories:', repositories.length);

    const content = (
      <div className="container mx-auto p-4 space-y-4">
        <GlobalStatsCard repositories={repositories} />
        <RecentRepositoriesCard repositories={repositories} />
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
