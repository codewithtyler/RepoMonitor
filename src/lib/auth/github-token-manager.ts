import { supabase } from './supabase-client';
import { logger } from '@/lib/utils/logger';

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
  private static validateToken(token: string): boolean {
    // GitHub OAuth tokens are 40 characters long
    // Fine-grained tokens start with 'gho_' and are at least 40 characters
    return token.length >= 40;
  }

  static async storeToken(userId: string, token: string): Promise<void> {
    try {
      if (!this.validateToken(token)) {
        logger.error('[GitHubTokenManager] Token validation failed');
        throw new Error('Invalid token format');
      }

      // Check if token already exists and is the same
      const { data: existingToken } = await supabase
        .from('github_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (existingToken?.token === token) {
        logger.info('[GitHubTokenManager] Skipping duplicate token update');
        return;
      }

      logger.info('[GitHubTokenManager] Storing token for user:', { userId });

      const { error: updateError } = await supabase
        .from('github_tokens')
        .upsert({ user_id: userId, token }, { onConflict: 'user_id' });

      if (updateError) {
        logger.error('[GitHubTokenManager] Failed to store token:', updateError);
        throw updateError;
      }

      logger.info('[GitHubTokenManager] Token stored successfully');
    } catch (error) {
      logger.error('[GitHubTokenManager] Database error storing token:', error);
      throw error;
    }
  }

  static async getToken(userId: string): Promise<string | null> {
    try {
      // First check session for provider token
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;

      if (providerToken && this.validateToken(providerToken)) {
        logger.info('[GitHubTokenManager] Found provider token in session');
        return providerToken;
      }

      // Then check local storage
      const localToken = localStorage.getItem(`github_token_${userId}`);
      if (localToken && this.validateToken(localToken)) {
        logger.info('[GitHubTokenManager] Using valid token from localStorage');
        return localToken;
      }

      // Finally check database
      const { data: tokenData, error } = await supabase
        .from('github_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (error || !tokenData) {
        logger.info('[GitHubTokenManager] No token in database');
        return null;
      }

      try {
        if (!this.validateToken(tokenData.token)) {
          logger.error('[GitHubTokenManager] Failed to decrypt token');
          return null;
        }

        logger.info('[GitHubTokenManager] Using valid token from database');
        return tokenData.token;
      } catch (decryptError) {
        logger.error('[GitHubTokenManager] Failed to decrypt token:', decryptError);
        return null;
      }
    } catch (error) {
      logger.error('[GitHubTokenManager] Failed to get token:', error);
      return null;
    }
  }

  static clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}
