import { useQuery } from '@tanstack/react-query';
import { getAuthState } from '@/lib/auth/global-state';
import { getGitHubClient, type GitHubRepository } from '@/lib/github';
import { logger } from '@/lib/utils/logger';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

export interface Repository {
  id: string;
  github_id: number;
  owner: string;
  name: string;
  description: string | null;
  url: string;
  visibility: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  subscribersCount: number;
  hasIssues: boolean | undefined;
  topics: string[] | undefined;
  size: number | undefined;
  lastAnalysisTimestamp?: string | null;
  isFork: boolean;
  source?: {
    owner: string;
    name: string;
  };
}

function generateRepoId(owner: string, name: string): string {
  return `${owner}/${name}`;
}

function convertGitHubRepository(repo: GitHubRepository): Repository {
  return {
    id: generateRepoId(repo.owner.login, repo.name),
    github_id: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    visibility: repo.visibility,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    subscribersCount: repo.subscribers_count || 0,
    hasIssues: repo.has_issues,
    topics: repo.topics,
    size: repo.size,
    isFork: repo.fork || false,
    source: repo.source ? {
      owner: repo.source.owner.login,
      name: repo.source.name
    } : undefined
  };
}

export function useRepositoryDetails(owner: string, name: string) {
  const queryKey = ['repository', owner, name];

  return useQuery<Repository | null>({
    queryKey,
    queryFn: async () => {
      const state = await getAuthState();
      if (!state.user) {
        throw new Error('User must be authenticated to fetch repository details');
      }

      const client = await getGitHubClient(state.user.id);
      const repository = await client.getRepository(owner, name);
      return repository ? convertGitHubRepository(repository) : null;
    },
    enabled: Boolean(owner && name)
  });
}

export function useRepositoriesData() {
  const queryKey = ['repositories'];

  return useQuery<Repository[]>({
    queryKey,
    queryFn: async () => {
      const state = await getAuthState();
      if (!state.user) {
        throw new Error('User must be authenticated to fetch repositories');
      }

      const client = await getGitHubClient(state.user.id);
      logger.debug('Fetching repositories');
      const repositories = await client.listUserRepositories();
      logger.debug('Repositories fetched successfully', { count: repositories.length });
      return repositories.map(convertGitHubRepository);
    }
  });
}

export async function addRepository(owner: string, name: string) {
  const state = await getAuthState();
  if (!state.user) {
    throw new Error('User must be authenticated');
  }

  const client = await getGitHubClient(state.user.id);
  const repository = await client.getRepository(owner, name);
  return repository ? convertGitHubRepository(repository) : null;
}

export async function removeRepository(owner: string, name: string) {
  const state = await getAuthState();
  if (!state.user) {
    throw new Error('User must be authenticated');
  }

  const client = await getGitHubClient(state.user.id);
  const repository = await client.getRepository(owner, name);
  return repository ? convertGitHubRepository(repository) : null;
}
