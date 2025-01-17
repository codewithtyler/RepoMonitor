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
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  default_branch: string;
  topics: string[];
  language: string | null;
  size: number;
  has_issues: boolean;
  is_archived: boolean;
  is_disabled: boolean;
  license: {
    key: string;
    name: string;
    url: string;
  } | null;
  repository_permissions: {
    public?: boolean;
    private?: boolean;
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
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
      try {
        if (!user) return [];

        // Fetch repositories from Supabase
        const { data: supabaseRepos, error: supabaseError } = await supabase
          .from('repositories')
          .select('*')
          .eq('analyzed_by_user_id', user.id);

        if (supabaseError) {
          console.error('[useRepositoriesData] Supabase error:', supabaseError);
          throw supabaseError;
        }

        // Return basic repository data without making GitHub API calls
        const repositories = (supabaseRepos ?? []).map((repo: SupabaseRepository) => ({
          id: repo.id,
          github_id: repo.github_id,
          owner: repo.owner,
          name: repo.name,
          openIssuesCount: repo.open_issues_count || 0,
          permissions: repo.repository_permissions,
          lastAnalysisTimestamp: repo.last_analysis_timestamp,
          isAnalyzing: false,
          url: `https://github.com/${repo.owner}/${repo.name}`
        }));

        return repositories;
      } catch (error) {
        console.error('[useRepositoriesData] Error:', error);
        throw error;
      }
    },
    enabled: !!user && !!withGitHub,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });

  // Function to manually refresh GitHub data for a specific repository
  const refreshRepositoryData = async (owner: string, name: string) => {
    try {
      const { user } = getAuthState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log(`[useRepositoriesData] Starting analysis for ${owner}/${name}`, {
        userId: user.id
      });

      const repository = await withGitHub(async (client) => {
        const data = await client.getRepository(owner, name);

        // Get current repository data to log ownership changes
        const { data: currentRepo } = await supabase
          .from('repositories')
          .select('id, analyzed_by_user_id')
          .eq('github_id', data.id)
          .single();

        if (currentRepo) {
          console.log('[useRepositoriesData] Updating repository:', {
            repoId: currentRepo.id,
            currentOwnerId: currentRepo.analyzed_by_user_id,
            newOwnerId: user.id
          });
        }

        // Update repository in Supabase with fresh GitHub data
        const { error: updateError } = await supabase
          .from('repositories')
          .update({
            github_id: data.id,
            owner: data.owner.login,
            name: data.name,
            description: data.description,
            stargazers_count: data.stargazers_count,
            forks_count: data.forks_count,
            open_issues_count: data.open_issues_count,
            default_branch: data.default_branch,
            topics: data.topics,
            language: data.language,
            size: data.size,
            has_issues: data.has_issues,
            is_archived: data.archived,
            is_disabled: data.disabled,
            license: data.license,
            repository_permissions: {
              public: data.visibility === 'public',
              private: data.visibility === 'private',
              admin: data.permissions?.admin ?? false,
              push: data.permissions?.push ?? false,
              pull: data.permissions?.pull ?? false
            },
            updated_at: new Date().toISOString(),
            analyzed_by_user_id: user.id
          })
          .eq('github_id', data.id);

        if (updateError) {
          console.error('[useRepositoriesData] Error updating repository:', updateError);
          throw updateError;
        }

        return data;
      });

      // Invalidate and refetch queries to update UI
      await queryClient.invalidateQueries({ queryKey: ['repositories'] });
      await refetch();

      console.log(`[useRepositoriesData] Analysis started for ${owner}/${name}`);
      return repository;
    } catch (error) {
      console.error('[useRepositoriesData] Error during analysis:', error);
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
    refreshRepositoryData,
  };
}

// Function to add a repository to tracking
export async function addRepository(owner: string, name: string, client: GitHubClient) {
  try {
    const { user } = getAuthState();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('[addRepository] Adding repository:', {
      owner,
      name,
      userId: user.id
    });

    // Get repository details from GitHub
    const repository = await client.getRepository(owner, name);

    // Check if repository already exists using owner and name
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('id, analyzed_by_user_id')
      .eq('owner', owner)
      .eq('name', name)
      .single();

    if (existingRepo) {
      console.log('[addRepository] Repository exists:', {
        repoId: existingRepo.id,
        currentOwnerId: existingRepo.analyzed_by_user_id,
        newOwnerId: user.id
      });
    }

    const repositoryData = {
      github_id: repository.id,
      owner: repository.owner.login,
      name: repository.name,
      description: repository.description,
      stargazers_count: repository.stargazers_count,
      forks_count: repository.forks_count,
      open_issues_count: repository.open_issues_count,
      default_branch: repository.default_branch,
      topics: repository.topics,
      language: repository.language,
      size: repository.size,
      has_issues: repository.has_issues,
      is_archived: repository.archived,
      is_disabled: repository.disabled,
      license: repository.license,
      repository_permissions: {
        public: repository.visibility === 'public',
        private: repository.visibility === 'private',
        admin: repository.permissions?.admin ?? false,
        push: repository.permissions?.push ?? false,
        pull: repository.permissions?.pull ?? false
      },
      updated_at: new Date().toISOString(),
      analyzed_by_user_id: user.id
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
      console.log('[addRepository] Repository updated:', {
        repoId: existingRepo.id,
        ownerId: user.id
      });
    } else {
      // Insert new repository
      const { error: insertError } = await supabase
        .from('repositories')
        .insert(repositoryData);

      if (insertError) {
        console.error('[addRepository] Error inserting repository:', insertError);
        throw insertError;
      }
      console.log('[addRepository] New repository inserted:', {
        owner,
        name,
        ownerId: user.id
      });
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

// Function to clear all repositories for the current user
export async function clearAllRepositories() {
  const { user } = getAuthState();
  if (!user) return;

  try {
    // First, delete all repositories that don't have an analyzed_by_user_id
    const { error: nullUserError } = await supabase
      .from('repositories')
      .delete()
      .is('analyzed_by_user_id', null);

    if (nullUserError) {
      console.error('[clearAllRepositories] Error clearing unowned repositories:', nullUserError);
      throw nullUserError;
    }

    // Then delete all repositories owned by the current user
    const { error: userReposError } = await supabase
      .from('repositories')
      .delete()
      .eq('analyzed_by_user_id', user.id);

    if (userReposError) {
      console.error('[clearAllRepositories] Error clearing user repositories:', userReposError);
      throw userReposError;
    }

    console.log('[clearAllRepositories] Successfully cleared all repositories');
  } catch (error) {
    console.error('[clearAllRepositories] Error:', error);
    throw error;
  }
}
