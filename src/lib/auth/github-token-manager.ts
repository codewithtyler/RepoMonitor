import { supabase } from './supabase-client';
import { logger } from '@/lib/utils/logger';

const TOKEN_STORAGE_KEY = 'github_token';
const DEBOUNCE_TIME = 1000; // 1 second
const TOKEN_EXPIRY = 8 * 60 * 60 * 1000; // 8 hours

interface TokenData {
  token: string;
  expires_at: string;
  scopes: string[];
}

export class GitHubTokenManager {
  private static validateToken(token: string): boolean {
    if (!token) return false;
    // GitHub OAuth tokens are 40 characters long
    // Fine-grained tokens start with 'gho_' and are at least 40 characters
    return token.length >= 40;
  }

  static async storeToken(userId: string, token: string): Promise<void> {
    try {
      if (!userId) {
        logger.error('[GitHubTokenManager] No user ID provided');
        throw new Error('No user ID provided');
      }

      if (!this.validateToken(token)) {
        logger.error('[GitHubTokenManager] Token validation failed');
        throw new Error('Invalid token format');
      }

      // Store in localStorage for quick access
      localStorage.setItem(`github_token_${userId}`, token);

      // Store in database for persistence
      const { error: updateError } = await supabase
        .from('github_tokens')
        .upsert({ user_id: userId, token }, { onConflict: 'user_id' });

      if (updateError) {
        logger.error('[GitHubTokenManager] Failed to store token:', updateError);
        throw updateError;
      }

      logger.info('[GitHubTokenManager] Token stored successfully');
    } catch (error) {
      logger.error('[GitHubTokenManager] Error storing token:', error);
      throw error;
    }
  }

  static async getToken(userId: string): Promise<string | null> {
    try {
      if (!userId) {
        logger.error('[GitHubTokenManager] No user ID provided');
        throw new Error('No user ID provided');
      }

      // First check session for provider token
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;

      if (providerToken && this.validateToken(providerToken)) {
        logger.info('[GitHubTokenManager] Using provider token from session');
        return providerToken;
      }

      // Then check local storage
      const localToken = localStorage.getItem(`github_token_${userId}`);
      if (localToken && this.validateToken(localToken)) {
        logger.info('[GitHubTokenManager] Using token from localStorage');
        return localToken;
      }

      // Finally check database
      const { data: tokenData, error } = await supabase
        .from('github_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('[GitHubTokenManager] Database error:', error);
        return null;
      }

      if (!tokenData?.token || !this.validateToken(tokenData.token)) {
        logger.error('[GitHubTokenManager] No valid token found');
        return null;
      }

      // Store in localStorage for future quick access
      localStorage.setItem(`github_token_${userId}`, tokenData.token);
      logger.info('[GitHubTokenManager] Using token from database');
      return tokenData.token;
    } catch (error) {
      logger.error('[GitHubTokenManager] Error getting token:', error);
      return null;
    }
  }

  static clearToken(userId?: string) {
    if (userId) {
      localStorage.removeItem(`github_token_${userId}`);
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  static clearAllTokens() {
    try {
      // Clear all tokens from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('github_token_')) {
          localStorage.removeItem(key);
        }
      });

      // Clear the main token storage
      localStorage.removeItem(TOKEN_STORAGE_KEY);

      logger.info('[GitHubTokenManager] All tokens cleared successfully');
    } catch (error) {
      logger.error('[GitHubTokenManager] Error clearing tokens:', error);
      throw error;
    }
  }
}
