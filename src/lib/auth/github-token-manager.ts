import { supabase } from '@/lib/auth/supabase-client';
import { logger } from '@/lib/utils/logger';
import { CookieManager } from '@/lib/utils/cookie-manager';

const TOKEN_STORAGE_KEY = 'github_token';

export class GitHubTokenManager {
  private static validateToken(token: string): boolean {
    if (!token) {
      logger.debug('[GitHubTokenManager] Token validation failed: token is empty');
      return false;
    }

    const cleanToken = token.trim();

    // Log token format (safely)
    logger.debug('[GitHubTokenManager] Validating token format', {
      length: cleanToken.length,
      startsWithGho: cleanToken.startsWith('gho_'),
      startsWithGhp: cleanToken.startsWith('ghp_'),
      isBase64: /^[A-Za-z0-9+/=]+$/.test(cleanToken)
    });

    // Accept any non-empty token that's at least 40 characters
    // GitHub tokens can vary in format (OAuth, fine-grained, PAT)
    const isValid = cleanToken.length >= 40;

    if (!isValid) {
      logger.debug('[GitHubTokenManager] Token validation failed: invalid length', {
        length: cleanToken.length
      });
    }

    return isValid;
  }

  static async getToken(userId: string, retryCount = 0): Promise<string | null> {
    try {
      if (!userId) {
        logger.error('[GitHubTokenManager] No user ID provided');
        throw new Error('No user ID provided');
      }

      logger.debug('[GitHubTokenManager] Getting token for user', { userId, retryCount });

      // First check session for provider token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error('[GitHubTokenManager] Failed to get session:', sessionError);
        return this.handleRetry(userId, retryCount, 'session error');
      }

      if (!session) {
        logger.error('[GitHubTokenManager] No valid session found');
        return this.handleRetry(userId, retryCount, 'no session');
      }

      const providerToken = session?.provider_token;

      if (providerToken) {
        const cleanProviderToken = providerToken.trim();
        if (this.validateToken(cleanProviderToken)) {
          logger.info('[GitHubTokenManager] Using provider token from session');
          // Store the token for future use
          try {
            await this.storeToken(userId, cleanProviderToken);
            // Also store in cookie as fallback
            CookieManager.setGitHubToken(cleanProviderToken);
          } catch (error) {
            logger.error('[GitHubTokenManager] Failed to store provider token:', error);
            // Continue using the provider token even if storage fails
          }
          return cleanProviderToken;
        } else {
          logger.warn('[GitHubTokenManager] Provider token failed validation', {
            length: cleanProviderToken.length
          });
        }
      }

      logger.debug('[GitHubTokenManager] No valid provider token, checking database');

      // Check database for stored token
      const { data: tokenData, error: dbError } = await supabase
        .from('github_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (dbError) {
        logger.error('[GitHubTokenManager] Database error:', dbError);
        // Try cookie fallback before retry
        const cookieToken = CookieManager.getGitHubToken();
        if (cookieToken && this.validateToken(cookieToken)) {
          logger.info('[GitHubTokenManager] Using token from cookie');
          return cookieToken;
        }
        return this.handleRetry(userId, retryCount, 'database error');
      }

      if (!tokenData?.token) {
        logger.error('[GitHubTokenManager] No token found in database');
        // Try cookie fallback before retry
        const cookieToken = CookieManager.getGitHubToken();
        if (cookieToken && this.validateToken(cookieToken)) {
          logger.info('[GitHubTokenManager] Using token from cookie');
          return cookieToken;
        }
        return this.handleRetry(userId, retryCount, 'no token in database');
      }

      // Decrypt the token using the pgsodium function
      const { data: decryptedToken, error: decryptError } = await supabase
        .rpc('decrypt_github_token', { encrypted_token: tokenData.token });

      if (decryptError) {
        logger.error('[GitHubTokenManager] Token decryption failed:', decryptError);
        // Try cookie fallback before retry
        const cookieToken = CookieManager.getGitHubToken();
        if (cookieToken && this.validateToken(cookieToken)) {
          logger.info('[GitHubTokenManager] Using token from cookie');
          return cookieToken;
        }
        return this.handleRetry(userId, retryCount, 'decryption error');
      }

      const cleanDecryptedToken = decryptedToken?.trim();
      if (!cleanDecryptedToken || !this.validateToken(cleanDecryptedToken)) {
        logger.error('[GitHubTokenManager] Decrypted token is invalid');
        // Try cookie fallback before retry
        const cookieToken = CookieManager.getGitHubToken();
        if (cookieToken && this.validateToken(cookieToken)) {
          logger.info('[GitHubTokenManager] Using token from cookie');
          return cookieToken;
        }
        // Remove invalid token from database
        await this.clearToken(userId);
        return this.handleRetry(userId, retryCount, 'invalid decrypted token');
      }

      logger.info('[GitHubTokenManager] Successfully retrieved token from database');
      // Store in cookie as fallback
      CookieManager.setGitHubToken(cleanDecryptedToken);
      return cleanDecryptedToken;
    } catch (error) {
      logger.error('[GitHubTokenManager] Error getting token:', error);
      // Try cookie fallback before retry
      const cookieToken = CookieManager.getGitHubToken();
      if (cookieToken && this.validateToken(cookieToken)) {
        logger.info('[GitHubTokenManager] Using token from cookie');
        return cookieToken;
      }
      return this.handleRetry(userId, retryCount, 'unexpected error');
    }
  }

  private static async handleRetry(userId: string, retryCount: number, reason: string): Promise<string | null> {
    const maxRetries = 5; // Increased from 3 to 5
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Increased max delay to 8 seconds

    if (retryCount < maxRetries) {
      logger.info(`[GitHubTokenManager] Retrying token retrieval in ${retryDelay}ms`, {
        userId,
        retryCount: retryCount + 1,
        reason
      });

      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return this.getToken(userId, retryCount + 1);
    }

    logger.error('[GitHubTokenManager] Max retries exceeded', {
      userId,
      reason
    });
    return null;
  }

  static async storeToken(userId: string, token: string): Promise<void> {
    try {
      if (!userId || !token) {
        logger.error('[GitHubTokenManager] Missing userId or token');
        throw new Error('Missing userId or token');
      }

      if (!this.validateToken(token)) {
        logger.error('[GitHubTokenManager] Invalid token format');
        throw new Error('Invalid token format');
      }

      logger.debug('[GitHubTokenManager] Storing token for user', { userId });

      // Store in database - encryption is handled by the database trigger
      const { error } = await supabase
        .from('github_tokens')
        .upsert({
          user_id: userId,
          token,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('[GitHubTokenManager] Error storing token in database:', error);
        throw error;
      }

      // Also store in cookie as fallback
      CookieManager.setGitHubToken(token);

      logger.info('[GitHubTokenManager] Token stored successfully');
    } catch (error) {
      logger.error('[GitHubTokenManager] Error storing token:', error);
      throw error;
    }
  }

  static async clearToken(userId: string) {
    if (!userId) {
      logger.error('[GitHubTokenManager] No user ID provided for token clearing');
      return;
    }

    try {
      logger.debug('[GitHubTokenManager] Clearing token for user', { userId });

      const { error } = await supabase
        .from('github_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('[GitHubTokenManager] Error clearing token from database:', error);
        throw error;
      }

      // Also clear cookie
      CookieManager.clearGitHubToken();

      logger.info('[GitHubTokenManager] Token cleared successfully');
    } catch (error) {
      logger.error('[GitHubTokenManager] Error clearing token:', error);
      throw error;
    }
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
