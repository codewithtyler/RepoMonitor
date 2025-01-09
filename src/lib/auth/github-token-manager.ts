import { supabase } from './supabase-client';

const TOKEN_STORAGE_KEY = 'github_token';
let lastTokenUpdate = 0;
const DEBOUNCE_TIME = 1000; // 1 second

export class GitHubTokenManager {
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

    console.log('[GitHubTokenManager] Storing token for user:', userId);

    // Store in localStorage
    localStorage.setItem(TOKEN_STORAGE_KEY, cleanToken);

    // Store in database
    const { error: updateError } = await supabase
      .from('github_tokens')
      .upsert({
        user_id: userId,
        token: cleanToken,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        scopes: ['repo', 'public_repo'],
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

  static async getToken(userId: string): Promise<string> {
    // Try localStorage first
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken?.startsWith('gho_')) {
      return storedToken;
    }

    // If not in localStorage, get from database
    const { data: tokenData, error } = await supabase
      .from('github_tokens')
      .select('token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData?.token) {
      console.error('[GitHubTokenManager] Failed to get token:', error);
      throw new Error('Failed to get GitHub token');
    }

    // Store in localStorage for future use
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenData.token);

    return tokenData.token;
  }

  static clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}
