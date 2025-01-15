import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase-client';
import { useGitHub } from '@/lib/hooks/use-github';
import { toast } from '@/hooks/use-toast';
import { getAuthState } from '@/lib/auth/global-state';
import { useEffect, useState } from 'react';
import { getRepositoryState, subscribeToRepositories, updateRepositories, setLoading, setError } from '@/lib/repository/global-state';
import { Repository } from '@/types/repository';
import { v5 as uuidv5 } from 'uuid';
import { GitHubClient, GitHubRepository } from '@/lib/github';

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

  const { data: repositories, refetch } = useQuery({
    queryKey: ['repositories', user?.id],
    queryFn: async () => {
      console.log('[useRepositoriesData] Fetching repositories');
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
              return null;
            }
          })
        );

        const validRepositories = repositories.filter((repo): repo is Repository => repo !== null);
        console.log('[useRepositoriesData] Final repository count:', validRepositories.length);

        return validRepositories;
      } catch (error) {
        console.error('[useRepositoriesData] Error:', error);
        throw error;
      }
    },
    enabled: !!user && !!withGitHub,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnMount: true,
  });

  // Function to manually refresh GitHub data for a specific repository
  const refreshRepositoryData = async (owner: string, name: string) => {
    try {
      const repository = await withGitHub(async (client) => {
        const data = await client.getRepository(owner, name);

        // Update repository in Supabase with fresh GitHub data
        const { error: updateError } = await supabase
          .from('repositories')
          .update({
            github_id: data.id,
            owner: data.owner.login,
            name: data.name,
            repository_permissions: {
              public: data.visibility === 'public',
              private: data.visibility === 'private',
              admin: data.permissions?.admin ?? false,
              push: data.permissions?.push ?? false,
              pull: data.permissions?.pull ?? false
            },
            is_public: data.visibility === 'public',
            updated_at: new Date().toISOString(),
            // Add these fields to update stats
            stargazers_count: data.stargazers_count,
            forks_count: data.forks_count,
            open_issues_count: data.open_issues_count,
            description: data.description,
            language: data.language,
            topics: data.topics,
            size: data.size,
            has_issues: data.has_issues,
            is_archived: data.archived,
            is_disabled: data.disabled,
            license: data.license ? {
              key: data.license.key,
              name: data.license.name,
              url: data.license.url
            } : null
          })
          .eq('github_id', data.id);

        if (updateError) {
          console.error('[refreshRepositoryData] Error updating repository:', updateError);
          throw updateError;
        }

        return data;
      });

      // Invalidate and refetch queries to update UI
      await queryClient.invalidateQueries({ queryKey: ['repositories'] });
      await refetch();

      return repository;
    } catch (error) {
      console.error('[refreshRepositoryData] Error:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (repositories) {
      updateRepositories(repositories);
    }
  }, [repositories]);

  return {
    repositories: state.repositories,
    isLoading: state.loading,
    error: state.error,
    refreshRepositoryData, // Expose the manual refresh function
  };
}

// Function to add a repository to tracking
export async function addRepository(owner: string, name: string, client: GitHubClient) {
  console.log('[addRepository] Adding repository:', { owner, name });

  try {
    // Get repository details from GitHub
    const repository = await client.getRepository(owner, name);

    // Check if repository already exists
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('id')
      .eq('github_id', repository.id)
      .single();

    const repositoryData = {
      github_id: repository.id,
      owner: repository.owner.login,
      name: repository.name,
      repository_permissions: {
        public: repository.visibility === 'public',
        private: repository.visibility === 'private',
        admin: repository.permissions?.admin ?? false,
        push: repository.permissions?.push ?? false,
        pull: repository.permissions?.pull ?? false
      },
      is_public: repository.visibility === 'public',
      updated_at: new Date().toISOString()
    };

    if (existingRepo) {
      // Update existing repository
      const { error: updateError } = await supabase
        .from('repositories')
        .update(repositoryData)
        .eq('id', existingRepo.id);

      if (updateError) {
        console.error('[addRepository] Error updating repository:', updateError);
        throw updateError;
      }
    } else {
      // Insert new repository
      const { error: insertError } = await supabase
        .from('repositories')
        .insert(repositoryData);

      if (insertError) {
        console.error('[addRepository] Error inserting repository:', insertError);
        throw insertError;
      }
    }

    return repository;
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

export function useRepositoryDetails(owner: string, name: string) {
  const { withGitHub } = useGitHub();

  return useQuery<GitHubRepository, Error>({
    queryKey: ['repository', owner, name],
    queryFn: async () => {
      console.log('[useRepositoryDetails] Fetching repository:', { owner, name });

      return withGitHub(async (client) => {
        try {
          // Get repository details directly
          const details = await client.getRepository(owner, name);
          return details;
        } catch (error) {
          console.error('[useRepositoryDetails] Error:', error);
          throw error;
        }
      });
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
    retry: false, // Don't retry on 404s
  });
}
