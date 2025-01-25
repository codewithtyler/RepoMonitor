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

    // Clean token
    const cleanToken = token.trim().replace(/\s+/g, '');

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

    // Store token in localStorage for quick access
    localStorage.setItem(TOKEN_STORAGE_KEY, cleanToken);

    try {
      // Store token in database - it will be encrypted by the trigger
      const { error: updateError } = await supabase
        .from('github_tokens')
        .upsert({
          user_id: userId,
          token: cleanToken,
          expires_at: tokenData.expires_at,
          scopes: tokenData.scopes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error('[GitHubTokenManager] Failed to store token:', updateError);
        throw updateError;
      }

      console.log('[GitHubTokenManager] Token stored successfully');
      return cleanToken;
    } catch (error) {
      console.error('[GitHubTokenManager] Database error storing token:', error);
      // Still return the token even if DB storage fails
      return cleanToken;
    }
  }

  static async getToken(): Promise<string> {
    try {
      // First try to get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user');
      }

      // If we have a provider token from the session, use and store it
      if (session.provider_token) {
        console.log('[GitHubTokenManager] Found provider token in session');
        return this.handleOAuthToken(session.provider_token, session.user.id);
      }

      // Try localStorage next for quick access
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken && await this.validateToken(storedToken)) {
        console.log('[GitHubTokenManager] Using valid token from localStorage');
        return storedToken;
      }

      // Finally, try to get from database
      const { data: tokenData, error: fetchError } = await supabase
        .from('github_tokens')
        .select('token, expires_at')
        .eq('user_id', session.user.id)
        .single();

      if (fetchError || !tokenData?.token) {
        console.log('[GitHubTokenManager] No token in database');
        throw new Error('No token found in database');
      }

      // Decrypt token using RPC function
      const { data: decryptedToken, error: decryptError } = await supabase
        .rpc('decrypt_github_token', {
          encrypted_token: tokenData.token
        });

      if (decryptError || !decryptedToken) {
        console.error('[GitHubTokenManager] Failed to decrypt token:', decryptError);
        throw new Error('Failed to decrypt token');
      }

      // Validate the token
      if (await this.validateToken(decryptedToken)) {
        console.log('[GitHubTokenManager] Using valid token from database');
        localStorage.setItem(TOKEN_STORAGE_KEY, decryptedToken);
        return decryptedToken;
      }

      throw new Error('No valid GitHub token found');
    } catch (error) {
      console.error('[GitHubTokenManager] Failed to get token:', error);
      this.clearToken();
      throw error;
    }
  }

  static clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}
