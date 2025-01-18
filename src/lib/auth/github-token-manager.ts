import { supabase } from './supabase-client';

const TOKEN_STORAGE_KEY = 'github_token';
let lastTokenUpdate = 0;
const DEBOUNCE_TIME = 1000; // 1 second
const TOKEN_EXPIRY = 8 * 60 * 60 * 1000; // 8 hours

interface TokenData {
  token: string;
  expires_at: string;
  scopes: string[];
}

export class GitHubTokenManager {
  private static async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.status === 200;
    } catch (error) {
      console.error('[GitHubTokenManager] Token validation failed:', error);
      return false;
    }
  }

  static async handleOAuthToken(token: string, userId: string): Promise<string> {
    // Debounce token updates
    const now = Date.now();
    if (now - lastTokenUpdate < DEBOUNCE_TIME) {
      console.log('[GitHubTokenManager] Skipping duplicate token update');
      return token;
    }
    lastTokenUpdate = now;

    // Clean and validate token
    const cleanToken = token.trim().replace(/\s+/g, '');
    if (!cleanToken.startsWith('gho_')) {
      console.error('[GitHubTokenManager] Invalid token format:', cleanToken.substring(0, 4));
      throw new Error('Invalid token format: must start with gho_');
    }

    // Validate token with GitHub API
    const isValid = await this.validateToken(cleanToken);
    if (!isValid) {
      console.error('[GitHubTokenManager] Token validation failed');
      throw new Error('Invalid GitHub token');
    }

    console.log('[GitHubTokenManager] Storing token for user:', userId);

    const tokenData: TokenData = {
      token: cleanToken,
      expires_at: new Date(Date.now() + TOKEN_EXPIRY).toISOString(),
      scopes: ['repo', 'read:user']
    };

    // Store raw token in localStorage
    localStorage.setItem(TOKEN_STORAGE_KEY, cleanToken);

    // Store encrypted token in database
    const { error: updateError } = await supabase
      .from('github_tokens')
      .upsert({
        user_id: userId,
        token: cleanToken, // This will be encrypted by the database trigger
        expires_at: tokenData.expires_at,
        scopes: tokenData.scopes,
        last_refresh: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('[GitHubTokenManager] Failed to store token:', updateError);
      throw new Error('Failed to store GitHub token');
    }

    console.log('[GitHubTokenManager] Token stored successfully');
    return cleanToken;
  }

  static async getToken(): Promise<string> {
    try {
      // Try localStorage first
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        // Validate the token
        if (await this.validateToken(storedToken)) {
          return storedToken;
        }
      }

      // If not in localStorage or invalid, try to get from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        // We have a fresh token from OAuth, store and return it
        const token = await this.handleOAuthToken(session.provider_token, session.user.id);
        return token;
      }

      // If we're on the callback page, wait a bit for the token to be processed
      if (window.location.pathname === '/auth/callback') {
        console.log('[GitHubTokenManager] On callback page, waiting for token...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newStoredToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (newStoredToken && await this.validateToken(newStoredToken)) {
          return newStoredToken;
        }
      }

      // If still no token, clear any invalid tokens and redirect
      this.clearToken();
      if (window.location.pathname !== '/auth/callback') {
        const redirectUrl = new URL('/auth/callback', window.location.origin);
        window.location.href = redirectUrl.toString();
      }

      throw new Error('No valid GitHub token found');
    } catch (error) {
      console.error('[GitHubTokenManager] Failed to get token:', error);
      this.clearToken();
      throw new Error('Failed to get GitHub token');
    }
  }

  static clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}
