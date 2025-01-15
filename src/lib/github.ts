import { GitHubTokenManager } from './auth/github-token-manager';
import { RateLimiter } from 'limiter';

// Per-user rate limiter (5000 requests per hour per token)
const userLimiters = new Map<string, RateLimiter>();

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
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
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface SearchOptions {
  query: string;
  page?: number;
  per_page?: number;
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
  order?: 'asc' | 'desc';
}

export interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
}

export interface GitHubClient {
  getRepository(owner: string, repo: string): Promise<GitHubRepository>;
  searchRepositories(options: SearchOptions): Promise<SearchResponse>;
}

class GitHubClientImpl implements GitHubClient {
  private token: string;
  private limiter: RateLimiter;

  private constructor(token: string, userId: string) {
    this.token = token;

    // Initialize rate limiter for this user if not exists
    if (!userLimiters.has(userId)) {
      userLimiters.set(userId, new RateLimiter({
        tokensPerInterval: 5000,
        interval: 'hour'
      }));
    }
    this.limiter = userLimiters.get(userId)!;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    console.log('Making GitHub API request:', path);

    // Wait for rate limit
    await this.limiter.removeTokens(1);

    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid or expired
        GitHubTokenManager.clearToken();
        throw new Error('GitHub token is invalid or expired');
      }
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error('rate limit exceeded');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async create(userId: string): Promise<GitHubClient> {
    try {
      const token = await GitHubTokenManager.getToken();
      return new GitHubClientImpl(token, userId);
    } catch (error) {
      console.error('[GitHubClient] Failed to create client:', error);
      // Clear token and redirect to auth
      GitHubTokenManager.clearToken();
      const redirectUrl = new URL('/auth/callback', window.location.origin);
      window.location.href = redirectUrl.toString();
      throw error;
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    console.log('Fetching repository:', { owner, repo });
    return this.request<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  async searchRepositories(options: SearchOptions): Promise<SearchResponse> {
    const {
      query,
      page = 1,
      per_page = 10,
      sort = 'stars',
      order = 'desc'
    } = options;

    console.log('Searching repositories:', { query, page, per_page, sort, order });

    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      per_page: per_page.toString(),
      sort,
      order
    });

    return this.request<SearchResponse>(`/search/repositories?${params}`);
  }
}

export async function getGitHubClient(userId: string): Promise<GitHubClient> {
  return GitHubClientImpl.create(userId);
}

export async function getRepository(owner: string, repo: string): Promise<GitHubRepository> {
  try {
    const token = await GitHubTokenManager.getToken();
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid or expired
        GitHubTokenManager.clearToken();
        throw new Error('GitHub token is invalid or expired');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('[getRepository] Error:', error);
    if (error instanceof Error && error.message.includes('token')) {
      // Redirect to auth if token is invalid
      const redirectUrl = new URL('/auth/callback', window.location.origin);
      window.location.href = redirectUrl.toString();
    }
    throw error;
  }
}
