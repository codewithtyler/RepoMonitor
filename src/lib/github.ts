import { GitHubTokenManager } from './auth/github-token-manager';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  visibility: string;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  license: {
    key: string;
    name: string;
    url: string;
  } | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  console.log('Making GitHub API request:', path);

  const token = await GitHubTokenManager.getToken();
  if (!token) {
    throw new Error('No GitHub token available');
  }

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getRepository(owner: string, repo: string): Promise<GitHubRepository> {
  console.log('Fetching repository:', { owner, repo });
  return request<GitHubRepository>(`/repos/${owner}/${repo}`);
}
