import { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/rest';
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
    console.log('[GitHubClient.constructor] Initializing client');
    this.userId = userId;
    this.octokit = new Octokit({
      auth: token,
      retry: {
        enabled: false, // We'll handle retries ourselves
      }
    });

    // Initialize rate limiter for this user if not exists
    if (!userLimiters.has(userId)) {
      console.log('[GitHubClient.constructor] Creating new rate limiter for user');
      userLimiters.set(userId, new RateLimiter({
        tokensPerInterval: 5000,
        interval: 'hour'
      }));
    }
    this.limiter = userLimiters.get(userId)!;
    console.log('[GitHubClient.constructor] Client initialization complete');
  }

  static async create(userId: string): Promise<GitHubClient> {
    console.log('[GitHubClient.create] Starting client creation for user:', userId);
    // Get user's token from database
    const { data: tokenData, error } = await supabase
      .from('github_tokens')
      .select('token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData?.token) {
      console.log('[GitHubClient.create] Failed to get token:', { error });
      throw new Error('Failed to get GitHub token');
    }

    console.log('[GitHubClient.create] Got token, decrypting...');
    // Decrypt token using our database function
    const { data: decryptedToken, error: decryptError } = await supabase
      .rpc('decrypt_github_token', { encrypted_token: tokenData.token });

    if (decryptError || !decryptedToken) {
      console.log('[GitHubClient.create] Failed to decrypt token:', { decryptError });
      throw new Error('Failed to decrypt GitHub token');
    }

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.log('[GitHubClient.create] Token is expired');
      throw new Error('TOKEN_EXPIRED');
    }

    console.log('[GitHubClient.create] Creating client instance');
    return new GitHubClient(decryptedToken, userId);
  }

  private async waitForRateLimit(): Promise<void> {
    console.log('[waitForRateLimit] Checking rate limit');
    const remainingTokens = await this.limiter.removeTokens(1);
    if (remainingTokens < 0) {
      const waitTime = -remainingTokens * (3600000 / 5000); // Convert to milliseconds
      console.log(`[waitForRateLimit] Need to wait ${Math.ceil(waitTime / 1000)} seconds`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    console.log('[waitForRateLimit] Rate limit check passed');
  }

  private async handleError(error: GitHubError, retryCount: number = 0): Promise<never> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    console.log(`[handleError] Processing error (attempt ${retryCount + 1}/${maxRetries}):`, {
      status: error.status,
      message: error.message,
      headers: error.response?.headers
    });

    if (error.status === 401) {
      console.log('[handleError] Got 401, handling token expiration');
      await this.handleTokenExpiration();
      throw new Error('TOKEN_EXPIRED');
    }

    // For any retryable error (403 rate limit or 5xx), signal retry
    if (error.status === 403) {
      console.log('[handleError] Got 403, checking rate limit');
      const resetTime = error.response?.headers?.['x-ratelimit-reset'];
      if (resetTime) {
        const waitTime = (parseInt(resetTime) * 1000) - Date.now();
        if (waitTime > 0) {
          console.log(`[handleError] Rate limit exceeded, waiting ${Math.ceil(waitTime / 1000)} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      console.log('[handleError] Signaling retry for 403');
      return Promise.reject(new Error('RETRY'));
    }

    if ([500, 502, 503, 504].includes(error.status || 0)) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`[handleError] Got ${error.status}, waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      console.log('[handleError] Signaling retry for server error');
      return Promise.reject(new Error('RETRY'));
    }

    console.log('[handleError] Non-retryable error, throwing');
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
        console.log(`[withRetry] Starting attempt ${retryCount + 1}/${maxRetries}`);
        await this.waitForRateLimit();
        console.log(`[withRetry] Executing operation (attempt ${retryCount + 1})`);
        const result = await operation();
        console.log(`[withRetry] Operation succeeded on attempt ${retryCount + 1}`);
        return result;
      } catch (error) {
        console.log(`[withRetry] Operation failed (attempt ${retryCount + 1}/${maxRetries}):`, {
          error: error instanceof Error ? error.message : error,
          type: error instanceof Error ? error.constructor.name : typeof error
        });
        
        if (retryCount >= maxRetries - 1) {
          console.log('[withRetry] Max retries exceeded, giving up');
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Max retries exceeded');
        }

        // Handle the error and potentially get a retry signal
        try {
          console.log('[withRetry] Handling error through handleError');
          await this.handleError(error as GitHubError, retryCount);
          console.log('[withRetry] handleError completed without retry signal');
          throw error;
        } catch (handledError) {
          console.log('[withRetry] Caught error from handleError:', {
            message: handledError instanceof Error ? handledError.message : handledError,
            isRetry: handledError instanceof Error && handledError.message === 'RETRY'
          });
          
          if ((handledError as Error).message === 'RETRY') {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`[withRetry] Will retry in ${delay}ms (attempt ${retryCount + 2}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            console.log(`[withRetry] Continuing to next attempt (${retryCount + 1})`);
            continue;
          }
          console.log('[withRetry] Non-retry error, rethrowing');
          throw handledError;
        }
      }
    }
    console.log('[withRetry] Exited retry loop, throwing max retries error');
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
    console.log('[listUserRepositories] Starting repository list with options:', options);
    return this.withRetry(async () => {
      console.log('[listUserRepositories] Making API call');
      const result = await this.octokit.repos.listForAuthenticatedUser({
        type: options.type || 'all',
        sort: options.sort || 'updated',
        per_page: options.per_page || 100,
        page: options.page || 1
      });
      console.log('[listUserRepositories] API call completed');
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