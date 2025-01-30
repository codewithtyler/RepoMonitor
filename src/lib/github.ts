import { GitHubTokenManager } from './auth/github-token-manager';
import { RateLimiter } from 'limiter';
import { logger } from '@/lib/utils/logger';

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
  topics?: string[];
  size?: number;
  has_issues?: boolean;
  archived?: boolean;
  disabled?: boolean;
  subscribers_count?: number;
  fork?: boolean;
  source?: {
    owner: {
      login: string;
    };
    name: string;
  };
  private?: boolean;
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
  searchRepositories(query: string, options?: SearchOptions): Promise<SearchResponse>;
  listRepositories(): Promise<GitHubRepository[]>;
  listRepositoryIssues(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
    page?: number;
  }): Promise<any[]>;
}

export class GitHubClientImpl implements GitHubClient {
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
    logger.debug('Making GitHub API request:', { path });

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
      const token = await GitHubTokenManager.getToken(userId);
      if (!token) {
        throw new Error('No GitHub token found');
      }
      return new GitHubClientImpl(token, userId);
    } catch (error) {
      logger.error('[GitHubClient] Failed to create client:', error);
      throw error;
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    logger.debug('Fetching repository:', { owner, repo });
    return this.request<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  async searchRepositories(query: string, options: Partial<Omit<SearchOptions, 'query'>> = {}): Promise<SearchResponse> {
    const searchOptions = {
      query,
      page: options.page || 1,
      per_page: options.per_page || 100,  // Default to 100 results
      sort: options.sort || 'updated',
      order: options.order || 'desc'
    };

    logger.debug('Searching repositories:', { query: searchOptions.query, options: searchOptions });

    // Build the search query according to GitHub search syntax
    // See: https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories
    const searchTerms = [
      searchOptions.query,           // User's search term
      'fork:true',                  // Include forks
      'archived:false',             // Exclude archived repos
      'is:public in:name in:description'  // Search in names and descriptions, public repos only
    ];

    const params = new URLSearchParams({
      q: searchTerms.join(' '),
      page: searchOptions.page.toString(),
      per_page: searchOptions.per_page.toString(),
      sort: searchOptions.sort,
      order: searchOptions.order
    });

    return this.request<SearchResponse>(`/search/repositories?${params}`);
  }

  async listRepositories(): Promise<GitHubRepository[]> {
    const params = new URLSearchParams({
      type: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: '100',  // Maximum allowed per page
      page: '1'
    });

    return this.request<GitHubRepository[]>(`/user/repos?${params}`);
  }

  async listRepositoryIssues(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
    page?: number;
  } = {}): Promise<any[]> {
    const params = new URLSearchParams({
      state: options.state || 'open',
      per_page: (options.per_page || 100).toString(),
      page: (options.page || 1).toString()
    });

    return this.request<any[]>(`/repos/${owner}/${repo}/issues?${params}`);
  }
}

export async function getGitHubClient(userId: string): Promise<GitHubClient> {
  return GitHubClientImpl.create(userId);
}
