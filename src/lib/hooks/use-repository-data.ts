import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase-client';
import { useGitHub } from './use-github';
import { toast } from '@/hooks/use-toast';
import { getAuthState } from '../auth/global-state';
import { useEffect, useState } from 'react';
import { getRepositoryState, subscribeToRepositories, updateRepositories, setLoading, setError } from '../repository/global-state';
import { Repository } from '../../types/repository';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

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
  const [state, setState] = useState(getRepositoryState());

  useEffect(() => {
    return subscribeToRepositories(setState);
  }, []);

  useQuery({
    queryKey: ['repositories', user?.id],
    queryFn: async () => {
      console.log('[useRepositoriesData] Fetching repositories');
      setLoading(true);

      try {
        if (!user) {
          console.log('[useRepositoriesData] No user found');
          return [];
        }

        // Fetch repositories with a single query
        const { data: supabaseRepos, error: supabaseError } = await supabase
          .from('repositories')
          .select('*');

        if (supabaseError) {
          console.error('[useRepositoriesData] Supabase error:', supabaseError);
          throw supabaseError;
        }

        console.log('[useRepositoriesData] Supabase returned:', {
          count: supabaseRepos?.length ?? 0,
          firstRepo: supabaseRepos?.[0] ? {
            id: supabaseRepos[0].id,
            owner: supabaseRepos[0].owner,
            name: supabaseRepos[0].name,
            columns: Object.keys(supabaseRepos[0])
          } : null
        });

        const repositories = await Promise.all(
          (supabaseRepos ?? []).map(async (repo: SupabaseRepository) => {
            try {
              const githubData = await withGitHub(async (client) => {
                const data = await client.getRepository(repo.owner, repo.name);
                if (!data) throw new Error('No GitHub data returned');
                return data;
              });

              return {
                id: repo.id,
                owner: repo.owner,
                name: repo.name,
                description: githubData.description,
                stargazersCount: githubData.stargazers_count,
                forksCount: githubData.forks_count,
                openIssuesCount: githubData.open_issues_count,
                lastAnalysisTimestamp: repo.last_analysis_timestamp,
                isAnalyzing: repo.is_analyzing,
                createdAt: new Date().toISOString(), // TODO: Get from GitHub
                updatedAt: new Date().toISOString(), // TODO: Get from GitHub
                url: `https://github.com/${repo.owner}/${repo.name}`,
              };
            } catch (error) {
              console.error(`[useRepositoriesData] Error fetching GitHub data for ${repo.owner}/${repo.name}:`, error);
              toast({
                title: 'Error',
                description: `Failed to fetch GitHub data for ${repo.owner}/${repo.name}`,
                variant: 'destructive',
              });
              return null;
            }
          })
        );

        const validRepositories = repositories.filter((repo): repo is Repository => repo !== null);
        console.log('[useRepositoriesData] Final repository count:', validRepositories.length);

        updateRepositories(validRepositories);
        return validRepositories;
      } catch (error) {
        console.error('[useRepositoriesData] Error:', error);
        if (error instanceof Error) {
          setError(error);
        } else {
          setError(new Error('Unknown error occurred'));
        }
        throw error;
      }
    },
    enabled: !!user && !!withGitHub,
  });

  return {
    repositories: state.repositories,
    isLoading: state.loading,
    error: state.error
  };
}
