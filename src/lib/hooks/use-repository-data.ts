import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase-client';
import { useGitHub } from './use-github';
import { toast } from '@/hooks/use-toast';
import { getAuthState } from '../auth/global-state';
import { useEffect } from 'react';

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

interface Repository {
  id: string;
  owner: string;
  name: string;
  description?: string;
  stargazersCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
  lastAnalysisTimestamp?: string;
  isAnalyzing?: boolean;
}

interface SupabaseRepository {
  id: string;
  owner: string;
  name: string;
  last_analysis_timestamp: string | null;
  is_analyzing: boolean;
}

interface GitHubRepository {
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

export function useRepositoriesData() {
  console.log('[useRepositoriesData] Hook initializing');
  const { withGitHub } = useGitHub();
  const queryClient = useQueryClient();
  const { user } = getAuthState();

  console.log('[useRepositoriesData] Initial state:', {
    userId: user?.id,
    hasWithGitHub: !!withGitHub,
    hasQueryClient: !!queryClient
  });

  // Fetch repositories from Supabase and GitHub
  const { data: repositories, isLoading, error } = useQuery<Repository[]>({
    queryKey: ['repositories', user?.id],
    queryFn: async () => {
      console.log('[useRepositoriesData] Query function starting');
      if (!user) {
        console.log('[useRepositoriesData] No user found, throwing error');
        throw new Error('Not authenticated');
      }

      // Fetch from Supabase
      console.log('[useRepositoriesData] Fetching from Supabase');
      const { data: supabaseRepos, error } = await supabase
        .from('repositories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useRepositoriesData] Supabase error:', error);
        throw error;
      }

      console.log('[useRepositoriesData] Supabase returned:', {
        repoCount: supabaseRepos?.length ?? 0,
        firstRepo: supabaseRepos?.[0] ? {
          owner: supabaseRepos[0].owner,
          name: supabaseRepos[0].name
        } : null
      });

      if (!supabaseRepos) return [];

      // Fetch GitHub data in batches
      const updatedRepos: Repository[] = [];
      const batchSize = 2;

      for (let i = 0; i < supabaseRepos.length; i += batchSize) {
        const batch = supabaseRepos.slice(i, i + batchSize);
        console.log('[useRepositoriesData] Processing batch', i / batchSize + 1);

        const batchPromises = batch.map(async (repo) => {
          try {
            console.log('[useRepositoriesData] Fetching GitHub data for:', repo.owner + '/' + repo.name);
            const githubData = await withGitHub<GitHubRepository | null>(async (client) => {
              return client.getRepository(repo.owner, repo.name);
            });

            const repository: Repository = {
              id: repo.id,
              owner: repo.owner,
              name: repo.name,
              description: githubData?.description || undefined,
              stargazersCount: githubData?.stargazers_count,
              forksCount: githubData?.forks_count,
              openIssuesCount: githubData?.open_issues_count,
              lastAnalysisTimestamp: repo.last_analysis_timestamp || undefined,
              isAnalyzing: repo.is_analyzing,
            };

            return repository;
          } catch (error) {
            console.error(`[useRepositoriesData] Error fetching GitHub data for ${repo.owner}/${repo.name}:`, error);
            toast({
              title: 'Warning',
              description: `Unable to fetch GitHub data for ${repo.owner}/${repo.name}`,
              variant: 'destructive',
            });

            // Return a minimal repository object on error
            return {
              id: repo.id,
              owner: repo.owner,
              name: repo.name,
              lastAnalysisTimestamp: repo.last_analysis_timestamp || undefined,
              isAnalyzing: repo.is_analyzing,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        updatedRepos.push(...batchResults);

        // Add delay between batches
        if (i + batchSize < supabaseRepos.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('[useRepositoriesData] Returning', updatedRepos.length, 'repositories');
      return updatedRepos;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set up real-time subscription for repository updates
  useEffect(() => {
    if (!user) return;

    console.log('[useRepositoriesData] Setting up real-time subscription');
    const channel = supabase
      .channel(`repository_changes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repositories',
        },
        () => {
          console.log('[useRepositoriesData] Received real-time update');
          // Invalidate the query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['repositories', user.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useRepositoriesData] Cleaning up subscription');
      void channel.unsubscribe();
    };
  }, [queryClient, user]);

  console.log('[useRepositoriesData] Hook returning:', {
    repositoryCount: repositories?.length ?? 0,
    isLoading,
    hasError: !!error
  });

  return {
    repositories: repositories || [],
    isLoading,
    error,
  };
}
