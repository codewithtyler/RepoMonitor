import { RateLimiter } from 'limiter';
import { GitHubTokenManager } from './auth/github-token-manager';

// Per-user rate limiter (5000 requests per hour per token)
const userLimiters = new Map<string, RateLimiter>();

const API_BASE = 'https://api.github.com';

interface GitHubError extends Error {
  status?: number;
  response?: {
    headers?: {
      'x-ratelimit-reset'?: string;
    };
  };
}

// Add interface for search results
interface GitHubSearchResult {
  total_count: number;
  items: Array<{
    id: number;
    full_name: string;
    [key: string]: any;
  }>;
}

export interface GitHubClient {
  getRepository(owner: string, repo: string): Promise<any>;
  listRepositoryIssues(owner: string, repo: string, options?: { state?: 'open' | 'closed' | 'all'; labels?: string; per_page?: number; page?: number }): Promise<any>;
  listRepositoryPullRequests(owner: string, repo: string, options?: { state?: 'open' | 'closed' | 'all'; per_page?: number; page?: number }): Promise<any>;
  searchRepositoryIssues(owner: string, repo: string, options?: { state?: 'open' | 'closed' | 'all'; per_page?: number; page?: number }): Promise<any>;
  checkRepositoryAccess(owner: string, repo: string): Promise<{ hasAccess: boolean; isPrivate: boolean | null; permissions: any | null }>;
  getCurrentUser(): Promise<any>;
  listUserRepositories(options?: { type?: 'all' | 'owner' | 'public' | 'private' | 'member'; sort?: 'created' | 'updated' | 'pushed' | 'full_name'; per_page?: number; page?: number; searchQuery?: string }): Promise<any>;
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
    const url = `${API_BASE}${path}`;

    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `token ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'RepoMonitor',
      ...options.headers
    };

    // Bind fetch to window explicitly
    const boundFetch = window.fetch.bind(window);
    const response = await boundFetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = new Error(response.statusText) as GitHubError;
      error.status = response.status;
      error.response = {
        headers: Object.fromEntries(response.headers.entries())
      };
      throw error;
    }

    return response.json();
  }

  static async create(userId: string): Promise<GitHubClient> {
    // Get token using the token manager
    const token = await GitHubTokenManager.getToken(userId);
    return new GitHubClientImpl(token, userId);
  }

  private async waitForRateLimit(): Promise<void> {
    const remainingTokens = await this.limiter.removeTokens(1);
    if (remainingTokens < 0) {
      const waitTime = -remainingTokens * (3600000 / 5000); // Convert to milliseconds
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private async handleError(error: GitHubError, _retryCount: number): Promise<void> {
    // Handle rate limit exceeded
    if (error.status === 403 && error.response?.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
      const now = Date.now();
      const waitTime = Math.max(0, resetTime - now);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      throw new Error('RETRY');
    }

    // Handle server errors (5xx)
    if (error.status && error.status >= 500 && error.status < 600) {
      throw new Error('RETRY');
    }

    throw error;
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await this.waitForRateLimit();
        const result = await operation();
        return result;
      } catch (error) {
        const githubError = error as GitHubError;

        if (retryCount >= maxRetries - 1) {
          throw error;
        }

        try {
          await this.handleError(githubError, retryCount);
          throw error;
        } catch (handledError) {
          if ((handledError as Error).message === 'RETRY') {
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
          throw handledError;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  // Repository operations
  async getRepository(owner: string, repo: string) {
    try {
      // First try the exact repository specified
      return await this.withRetry(() =>
        this.request(`/repos/${owner}/${repo}`)
      );
    } catch (error) {
      if ((error as GitHubError).status === 404) {
        // If not found, search for repositories with this name
        const searchParams = new URLSearchParams({
          q: `${repo} in:name`,
          sort: 'stars',
          order: 'desc',
          per_page: '10'
        });

        const searchResult = await this.withRetry(() =>
          this.request<GitHubSearchResult>(`/search/repositories?${searchParams}`)
        );

        if (searchResult.total_count === 0) {
          throw new Error(`No repositories found matching '${repo}'`);
        }

        return {
          ...searchResult.items[0],
          _searchResults: searchResult.items,
          _isSearchResult: true
        };
      }
      throw error;
    }
  }

  async listRepositoryIssues(owner: string, repo: string, options: { state?: 'open' | 'closed' | 'all'; labels?: string; per_page?: number; page?: number } = {}) {
    const params = new URLSearchParams({
      state: options.state || 'open',
      per_page: (options.per_page || 100).toString(),
      page: (options.page || 1).toString()
    });
    if (options.labels) params.set('labels', options.labels);

    const response = await this.withRetry(() =>
      this.request(`/repos/${owner}/${repo}/issues?${params}`)
    );
    return response;
  }

  async listRepositoryPullRequests(owner: string, repo: string, options: { state?: 'open' | 'closed' | 'all'; per_page?: number; page?: number } = {}) {
    const params = new URLSearchParams({
      state: options.state || 'open',
      per_page: (options.per_page || 100).toString(),
      page: (options.page || 1).toString()
    });

    const response = await this.withRetry(() =>
      this.request(`/repos/${owner}/${repo}/pulls?${params}`)
    );
    return response;
  }

  async searchRepositoryIssues(owner: string, repo: string, options: { state?: 'open' | 'closed' | 'all'; per_page?: number; page?: number } = {}) {
    const query = `repo:${owner}/${repo} is:issue -is:pr is:${options.state || 'open'}`;
    const params = new URLSearchParams({
      q: query,
      per_page: (options.per_page || 100).toString(),
      page: (options.page || 1).toString()
    });

    const response = await this.withRetry(() =>
      this.request(`/search/issues?${params}`)
    );
    return response;
  }

  async checkRepositoryAccess(owner: string, repo: string) {
    try {
      const response = await this.withRetry(() =>
        this.request<{ private: boolean; permissions: any }>(`/repos/${owner}/${repo}`)
      );

      return {
        hasAccess: true,
        isPrivate: response.private,
        permissions: response.permissions
      };
    } catch (error) {
      if ((error as GitHubError).status === 404) {
        return {
          hasAccess: false,
          isPrivate: null,
          permissions: null
        };
      }
      throw error;
    }
  }

  // User operations
  async getCurrentUser() {
    return this.withRetry(() =>
      this.request('/user')
    );
  }

  async listUserRepositories(options: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
    page?: number;
    searchQuery?: string;
  } = {}) {
    // If we have a search query, search for repositories
    if (options.searchQuery) {
      // First get the authenticated user's login
      const user = await this.withRetry(() =>
        this.request<{ login: string }>('/user')
      );

      // Build search query using GitHub's search qualifiers
      const searchQuery = options.searchQuery.toLowerCase();

      // First get all user's repositories that match the query
      const userRepos = await this.withRetry(() =>
        this.request<any[]>('/user/repos')
      ).catch(() => []);

      // Filter user's repos to match the search query
      const matchingUserRepos = userRepos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery)
      );

      // Then get all other repositories
      const query = encodeURIComponent(`${searchQuery} in:name`);
      const searchResult = await this.withRetry(() =>
        this.request<GitHubSearchResult>(`/search/repositories?q=${query}&sort=stars&order=desc&per_page=100`)
      ).catch(() => ({ items: [] }));

      // Combine results, excluding duplicates
      const allItems = [...matchingUserRepos];
      for (const item of searchResult.items) {
        if (!allItems.some(existing => existing.id === item.id)) {
          allItems.push(item);
        }
      }

      // Sort results
      const sortedItems = allItems.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aOwner = a.owner.login.toLowerCase();
        const bOwner = b.owner.login.toLowerCase();
        const userLogin = user.login.toLowerCase();

        // First, prioritize exact name matches
        const aExactMatch = aName === searchQuery;
        const bExactMatch = bName === searchQuery;

        if (aExactMatch || bExactMatch) {
          // If at least one is an exact match, use priority + stars system
          const aPriority = aOwner === userLogin ? 1 : 2;
          const bPriority = bOwner === userLogin ? 1 : 2;

          // If priorities are different, sort by priority
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          // If same priority, sort by stars
          return (b.stargazers_count || 0) - (a.stargazers_count || 0);
        }

        // For non-exact matches, prioritize by name similarity
        const aStartsWith = aName.startsWith(searchQuery);
        const bStartsWith = bName.startsWith(searchQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Then by user's repositories
        if (aOwner === userLogin && bOwner !== userLogin) return -1;
        if (aOwner !== userLogin && bOwner === userLogin) return 1;

        // Finally, sort by stars
        return (b.stargazers_count || 0) - (a.stargazers_count || 0);
      });

      // Return top results after sorting
      return sortedItems.slice(0, options.per_page || 10);
    }

    // If no search query, get user's repositories
    const params = new URLSearchParams({
      type: options.type || 'all',
      sort: options.sort || 'updated',
      per_page: (options.per_page || 100).toString(),
      page: (options.page || 1).toString()
    });

    return this.withRetry(() =>
      this.request<any[]>(`/user/repos?${params}`)
    );
  }
}

export async function getGitHubClient(userId: string): Promise<GitHubClient> {
  return GitHubClientImpl.create(userId);
}