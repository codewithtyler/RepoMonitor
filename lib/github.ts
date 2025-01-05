import { RateLimiter } from 'limiter';
import { supabase } from './auth/supabase-client';

// Per-user rate limiter (5000 requests per hour per token)
const userLimiters = new Map<string, RateLimiter>();

interface GitHubError extends Error {
  status?: number;
  response?: {
    headers?: {
      'x-ratelimit-reset'?: string;
    };
  };
}

type IssueState = 'open' | 'closed' | 'all';

interface GetIssuesOptions {
  state?: IssueState;
  labels?: string;
  per_page?: number;
  page?: number;
}

class GitHubClient {
  private octokit: Octokit;
  private userId: string;
  private limiter: RateLimiter;

  private constructor(token: string, userId: string) {
    this.userId = userId;
    this.octokit = new Octokit({
      auth: token,
      retry: {
        enabled: false, // We'll handle retries ourselves
      }
    });

    // Initialize rate limiter for this user if not exists
    if (!userLimiters.has(userId)) {
      userLimiters.set(userId, new RateLimiter({
        tokensPerInterval: 5000,
        interval: 'hour'
      }));
    }
    this.limiter = userLimiters.get(userId)!;
  }

  static async create(userId: string): Promise<GitHubClient> {
    // Get user's token from database
    const { data: tokenData, error } = await supabase
      .from('github_tokens')
      .select('token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData?.token) {
      throw new Error('Failed to get GitHub token');
    }

    // Decrypt token using our database function
    const { data: decryptedToken, error: decryptError } = await supabase
      .rpc('decrypt_github_token', { encrypted_token: tokenData.token });

    if (decryptError || !decryptedToken) {
      throw new Error('Failed to decrypt GitHub token');
    }

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      throw new Error('TOKEN_EXPIRED');
    }

    return new GitHubClient(decryptedToken, userId);
  }

  private async waitForRateLimit(): Promise<void> {
    const remainingTokens = await this.limiter.removeTokens(1);
    if (remainingTokens < 0) {
      const waitTime = -remainingTokens * (3600000 / 5000); // Convert to milliseconds
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private async handleError(error: GitHubError, retryCount: number = 0): Promise<never> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    if (error.status === 401) {
      await this.handleTokenExpiration();
      throw new Error('TOKEN_EXPIRED');
    }

    // For any retryable error (403 rate limit or 5xx), signal retry
    if (error.status === 403) {
      const resetTime = error.response?.headers?.['x-ratelimit-reset'];
      if (resetTime) {
        const waitTime = (parseInt(resetTime) * 1000) - Date.now();
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      return Promise.reject(new Error('RETRY'));
    }

    if ([500, 502, 503, 504].includes(error.status || 0)) {
      const delay = baseDelay * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return Promise.reject(new Error('RETRY'));
    }

    throw new Error(`GitHub API error: ${error.message}`);
  }

  private async handleTokenExpiration(): Promise<void> {
    // Update database to mark token as expired
    await supabase
      .from('github_tokens')
      .update({
        expires_at: new Date().toISOString(),
        last_refresh: null
      })
      .eq('user_id', this.userId);
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
        if (retryCount >= maxRetries - 1) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Max retries exceeded');
        }

        // Handle the error and potentially get a retry signal
        try {
          await this.handleError(error as GitHubError, retryCount);
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
    return this.withRetry(() => this.octokit.repos.get({ owner, repo }));
  }

  async listRepositoryIssues(owner: string, repo: string, options: { state?: string; labels?: string; per_page?: number; page?: number } = {}) {
    return this.withRetry(() =>
      this.octokit.issues.listForRepo({
        owner,
        repo,
        state: (options.state || 'open') as IssueState,
        labels: options.labels,
        per_page: options.per_page || 100,
        page: options.page || 1
      })
    );
  }

  async checkRepositoryAccess(owner: string, repo: string) {
    try {
      const response = await this.withRetry(() =>
        this.octokit.repos.get({ owner, repo })
      ) as RestEndpointMethodTypes['repos']['get']['response'];

      return {
        hasAccess: true,
        isPrivate: response.data.private,
        permissions: response.data.permissions
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
    return this.withRetry(() => this.octokit.users.getAuthenticated());
  }

  async listUserRepositories(options: { type?: 'all' | 'owner' | 'public' | 'private' | 'member'; sort?: 'created' | 'updated' | 'pushed' | 'full_name'; per_page?: number; page?: number } = {}) {
    return this.withRetry(async () => {
      const result = await this.octokit.repos.listForAuthenticatedUser({
        type: options.type || 'all',
        sort: options.sort || 'updated',
        per_page: options.per_page || 100,
        page: options.page || 1
      });

      return result;
    });
  }

  async getIssues(owner: string, repo: string, options: GetIssuesOptions = {}) {
    return this.withRetry(() =>
      this.octokit.issues.listForRepo({
        owner,
        repo,
        state: (options.state || 'open') as IssueState,
        labels: options.labels,
        per_page: options.per_page || 100,
        page: options.page || 1
      })
    );
  }
}

export async function getGitHubClient(userId: string): Promise<GitHubClient> {
  return GitHubClient.create(userId);
}