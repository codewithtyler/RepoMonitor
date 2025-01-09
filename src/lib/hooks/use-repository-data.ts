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
                createdAt: githubData.created_at,
                updatedAt: githubData.updated_at,
                url: `https://github.com/${repo.owner}/${repo.name}`,
                visibility: githubData.visibility as 'public' | 'private',
                defaultBranch: githubData.default_branch,
                permissions: {
                  admin: githubData.permissions?.admin ?? false,
                  push: githubData.permissions?.push ?? false,
                  pull: githubData.permissions?.pull ?? false,
                },
                topics: githubData.topics ?? [],
                language: githubData.language,
                size: githubData.size,
                hasIssues: githubData.has_issues,
                isArchived: githubData.archived,
                isDisabled: githubData.disabled,
                license: githubData.license ? {
                  key: githubData.license.key,
                  name: githubData.license.name,
                  url: githubData.license.url,
                } : null,
              };
            } catch (error) {
              console.error(`[useRepositoriesData] Error fetching GitHub data for ${repo.owner}/${repo.name}:`, error);

              // Implement retry logic for transient errors
              if (error instanceof Error &&
                (error.message.includes('rate limit') ||
                  error.message.includes('network') ||
                  error.message.includes('timeout'))) {
                const retryDelay = 1000; // 1 second
                console.log(`[useRepositoriesData] Retrying fetch for ${repo.owner}/${repo.name} in ${retryDelay}ms`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));

                try {
                  const retryData = await withGitHub(async (client) => {
                    const data = await client.getRepository(repo.owner, repo.name);
                    if (!data) throw new Error('No GitHub data returned on retry');
                    return data;
                  });

                  return {
                    id: repo.id,
                    owner: repo.owner,
                    name: repo.name,
                    description: retryData.description,
                    stargazersCount: retryData.stargazers_count,
                    forksCount: retryData.forks_count,
                    openIssuesCount: retryData.open_issues_count,
                    lastAnalysisTimestamp: repo.last_analysis_timestamp,
                    isAnalyzing: repo.is_analyzing,
                    createdAt: retryData.created_at,
                    updatedAt: retryData.updated_at,
                    url: `https://github.com/${repo.owner}/${repo.name}`,
                    visibility: retryData.visibility as 'public' | 'private',
                    defaultBranch: retryData.default_branch,
                    permissions: {
                      admin: retryData.permissions?.admin ?? false,
                      push: retryData.permissions?.push ?? false,
                      pull: retryData.permissions?.pull ?? false,
                    },
                    topics: retryData.topics ?? [],
                    language: retryData.language,
                    size: retryData.size,
                    hasIssues: retryData.has_issues,
                    isArchived: retryData.archived,
                    isDisabled: retryData.disabled,
                    license: retryData.license ? {
                      key: retryData.license.key,
                      name: retryData.license.name,
                      url: retryData.license.url,
                    } : null,
                  };
                } catch (retryError) {
                  console.error(`[useRepositoriesData] Retry failed for ${repo.owner}/${repo.name}:`, retryError);
                }
              }

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
