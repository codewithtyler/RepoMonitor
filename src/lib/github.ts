import { GitHubTokenManager } from './auth/github-token-manager';
import { RateLimiter } from 'limiter';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/auth/supabase-client';

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
  listUserRepositories(): Promise<GitHubRepository[]>;
  searchPublicRepositories(query: string, limit: number): Promise<SearchResponse>;
  listRepositoryIssues(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
    page?: number;
  }): Promise<any[]>;
}

export class GitHubClientImpl implements GitHubClient {
  private token: string;
  private limiter: RateLimiter;
  private userId: string;

  private constructor(token: string, userId: string) {
    if (!token) {
      logger.error('[GitHubClient] Attempted to create client with null/empty token');
      throw new Error('Invalid token provided to GitHubClient');
    }
    if (!userId) {
      logger.error('[GitHubClient] Attempted to create client with null/empty userId');
      throw new Error('Invalid userId provided to GitHubClient');
    }

    this.token = token;
    this.userId = userId;
    logger.debug('[GitHubClient] Creating new client instance', { userId });

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
    try {
      logger.debug('[GitHubClient] Starting API request', {
        path,
        userId: this.userId,
        hasToken: !!this.token,
        tokenLength: this.token?.length
      });

      // Wait for rate limit
      await this.limiter.removeTokens(1);

      // Verify we still have a valid token before making request
      if (!this.token) {
        logger.error('[GitHubClient] Token is null/empty before request');
        throw new Error('No valid token available');
      }

      // Ensure token is properly formatted
      const cleanToken = this.token.trim();
      if (!cleanToken || cleanToken.length < 40) {
        logger.error('[GitHubClient] Token is invalid', {
          tokenLength: cleanToken.length,
          tokenStart: cleanToken.substring(0, 10) + '...'
        });
        await GitHubTokenManager.clearToken(this.userId);
        throw new Error('Invalid token format');
      }

      // Log token format (safely)
      logger.debug('[GitHubClient] Token format check', {
        length: cleanToken.length,
        startsWithGho: cleanToken.startsWith('gho_'),
        startsWithGhp: cleanToken.startsWith('ghp_'),
        isBase64: /^[A-Za-z0-9+/=]+$/.test(cleanToken)
      });

      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${cleanToken}`,
        ...options.headers
      };

      const requestOptions: RequestInit = {
        ...options,
        headers,
        method: options.method || 'GET'
      };

      logger.debug('[GitHubClient] Making fetch request', {
        url: `https://api.github.com${path}`,
        method: requestOptions.method,
        hasHeaders: !!requestOptions.headers
      });

      const response = await fetch(`https://api.github.com${path}`, requestOptions);

      logger.debug('[GitHubClient] Received API response', {
        path,
        status: response.status,
        statusText: response.statusText,
        remainingRateLimit: response.headers.get('x-ratelimit-remaining')
      });

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn('[GitHubClient] Received 401 unauthorized response, clearing token', {
            userId: this.userId
          });

          // Check if user's session is still valid
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            logger.error('[GitHubClient] No valid session found');
            throw new Error('User session expired');
          }

          // Clear the token and force a refresh
          await GitHubTokenManager.clearToken(this.userId);
          this.token = ''; // Clear local token
          throw new Error('GitHub token is invalid or expired - please refresh the page to re-authenticate');
        }
        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
          logger.warn('[GitHubClient] Rate limit exceeded', {
            userId: this.userId,
            resetTime: response.headers.get('x-ratelimit-reset')
          });
          throw new Error('GitHub API rate limit exceeded - please try again later');
        }

        // Try to get response body for better error message
        let errorBody = '';
        try {
          const errorJson = await response.json();
          errorBody = JSON.stringify(errorJson);
        } catch {
          errorBody = await response.text();
        }

        logger.error('[GitHubClient] GitHub API error', {
          status: response.status,
          statusText: response.statusText,
          errorBody
        });

        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('[GitHubClient] Request failed', {
        path,
        userId: this.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async create(userId: string): Promise<GitHubClient> {
    try {
      logger.debug('[GitHubClient] Creating new client', { userId });

      // Check if user has a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.error('[GitHubClient] No valid session found during client creation');
        throw new Error('User must be authenticated');
      }

      const token = await GitHubTokenManager.getToken(userId);
      if (!token) {
        logger.error('[GitHubClient] No token found during client creation');
        throw new Error('No GitHub token found - please re-authenticate');
      }

      logger.debug('[GitHubClient] Successfully created client', { userId });
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
    const params = new URLSearchParams({
      q: query,
      sort: options.sort || 'stars',
      order: options.order || 'desc',
      per_page: (options.per_page || 30).toString(),
      page: (options.page || 1).toString()
    });

    return this.request<SearchResponse>(`/search/repositories?${params}`);
  }

  async listUserRepositories(): Promise<GitHubRepository[]> {
    // Get all repositories the user has access to (including private)
    return this.request<GitHubRepository[]>('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator');
  }

  async searchPublicRepositories(query: string, limit: number): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: limit.toString()
    });

    return this.request<SearchResponse>(`/search/repositories?${params}`);
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
