import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase-client';
import { useGitHub } from '@/lib/hooks/use-github';
import { toast } from '@/hooks/use-toast';
import { getAuthState } from '@/lib/auth/global-state';
import { useEffect, useState } from 'react';
import { getRepositoryState, subscribeToRepositories, updateRepositories, setLoading, setError } from '@/lib/repository/global-state';
import { Repository } from '@/types/repository';
import { v5 as uuidv5 } from 'uuid';

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
  github_id: number;
  owner: string;
  name: string;
  created_at: string;
  updated_at: string;
  repository_permissions: {
    public?: boolean;
    private?: boolean;
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
  is_public: boolean;
  analyzed_by_user_id: string | null;
  last_analysis_timestamp: string | null;
}

interface GitHubRepository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  visibility: 'public' | 'private';
  default_branch: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  topics: string[];
  language: string | null;
  size: number;
  has_issues: boolean;
  archived: boolean;
  disabled: boolean;
  license: {
    key: string;
    name: string;
    url: string;
  } | null;
}

// UUID namespace for repository IDs (using a constant UUID for consistency)
const REPO_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Function to generate a deterministic UUID for a repository
const generateRepoId = (owner: string, name: string): string => {
  const uniqueString = `${owner}/${name}`;
  return uuidv5(uniqueString, REPO_NAMESPACE);
};

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

        // Fetch repositories from Supabase
        const { data: supabaseRepos, error: supabaseError } = await supabase
          .from('repositories')
          .select('*');

        if (supabaseError) {
          console.error('[useRepositoriesData] Supabase error:', supabaseError);
          throw supabaseError;
        }

        console.log('[useRepositoriesData] Supabase returned:', {
          count: supabaseRepos?.length ?? 0,
          repos: supabaseRepos?.map(repo => `${repo.owner}/${repo.name}`) ?? []
        });

        const repositories = await Promise.all(
          (supabaseRepos ?? []).map(async (repo: SupabaseRepository) => {
            try {
              const githubData = await withGitHub(async (client) => {
                try {
                  const data = await client.getRepository(repo.owner, repo.name);
                  return data;
                } catch (error) {
                  if (error instanceof Error && error.message.includes('404')) {
                    console.log(`[useRepositoriesData] Repository not found: ${repo.owner}/${repo.name}`);
                    // Remove repository if not found
                    await supabase
                      .from('repositories')
                      .delete()
                      .eq('id', repo.id);
                    return null;
                  }
                  throw error;
                }
              });

              if (!githubData) {
                return null;
              }

              // Update repository permissions and metadata
              const { error: updateError } = await supabase
                .from('repositories')
                .update({
                  repository_permissions: {
                    public: githubData.visibility === 'public',
                    private: githubData.visibility === 'private',
                    admin: githubData.permissions?.admin ?? false,
                    push: githubData.permissions?.push ?? false,
                    pull: githubData.permissions?.pull ?? false
                  },
                  is_public: githubData.visibility === 'public',
                  updated_at: new Date().toISOString()
                })
                .eq('id', repo.id);

              if (updateError) {
                console.error('[useRepositoriesData] Error updating repository:', updateError);
              }

              return {
                id: repo.id,
                github_id: githubData.id,
                owner: repo.owner,
                name: repo.name,
                description: githubData.description,
                stargazersCount: githubData.stargazers_count,
                forksCount: githubData.forks_count,
                openIssuesCount: githubData.open_issues_count,
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

              // Only show toast for non-404 errors
              if (!(error instanceof Error && error.message.includes('404'))) {
                toast({
                  title: 'Error',
                  description: `Failed to fetch GitHub data for ${repo.owner}/${repo.name}`,
                  variant: 'destructive',
                });
              }
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
      } finally {
        setLoading(false);
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

// Function to add a repository to tracking
export async function addRepository(owner: string, name: string) {
  const { withGitHub } = useGitHub();
  const { user } = getAuthState();

  if (!user) {
    console.error('[addRepository] No user found');
    return;
  }

  try {
    // Check repository access and get permissions
    const githubData = await withGitHub(async (client) => {
      const data = await client.getRepository(owner, name);
      return data;
    });

    const newRepo = {
      id: generateRepoId(owner, name),
      github_id: githubData.id,
      owner,
      name,
      repository_permissions: {
        public: githubData.visibility === 'public',
        private: githubData.visibility === 'private',
        admin: githubData.permissions?.admin ?? false,
        push: githubData.permissions?.push ?? false,
        pull: githubData.permissions?.pull ?? false
      },
      is_public: githubData.visibility === 'public',
      analyzed_by_user_id: null,
      last_analysis_timestamp: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('repositories')
      .upsert(newRepo);

    if (error) {
      console.error('[addRepository] Error adding repository:', error);
      throw error;
    }

    console.log('[addRepository] Repository added:', { owner, name });
  } catch (error) {
    console.error('[addRepository] Error:', error);
    throw error;
  }
}

// Function to remove a repository from tracking
export async function removeRepository(owner: string, name: string) {
  const repoId = generateRepoId(owner, name);

  const { error } = await supabase
    .from('repositories')
    .delete()
    .eq('id', repoId);

  if (error) {
    console.error('[removeRepository] Error removing repository:', error);
    throw error;
  }

  console.log('[removeRepository] Repository removed:', { owner, name });
}
