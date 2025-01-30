import { supabase } from '@/lib/auth/supabase-client';
import { logger } from '@/lib/utils/logger';

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

    // GitHub OAuth tokens are 40 characters long
    // Fine-grained tokens start with 'gho_' and are at least 40 characters
    // Personal access tokens start with 'ghp_'
    const isValid = cleanToken.length >= 40 && (
      cleanToken.startsWith('gho_') ||
      cleanToken.startsWith('ghp_') ||
      /^[A-Za-z0-9]{40}$/.test(cleanToken) // Classic OAuth token format
    );

    if (!isValid) {
      logger.debug('[GitHubTokenManager] Token validation failed: invalid format', {
        length: cleanToken.length,
        format: cleanToken.startsWith('gho_') ? 'fine-grained' :
          cleanToken.startsWith('ghp_') ? 'personal-access' :
            cleanToken.length === 40 ? 'classic' : 'unknown'
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
        return this.handleRetry(userId, retryCount, 'database error');
      }

      if (!tokenData?.token) {
        logger.error('[GitHubTokenManager] No token found in database');
        return this.handleRetry(userId, retryCount, 'no token in database');
      }

      // Decrypt the token using the pgsodium function
      const { data: decryptedToken, error: decryptError } = await supabase
        .rpc('decrypt_github_token', { encrypted_token: tokenData.token });

      if (decryptError) {
        logger.error('[GitHubTokenManager] Token decryption failed:', decryptError);
        return this.handleRetry(userId, retryCount, 'decryption error');
      }

      const cleanDecryptedToken = decryptedToken?.trim();
      if (!cleanDecryptedToken || !this.validateToken(cleanDecryptedToken)) {
        logger.error('[GitHubTokenManager] Decrypted token is invalid');
        // Remove invalid token from database
        await this.clearToken(userId);
        return this.handleRetry(userId, retryCount, 'invalid decrypted token');
      }

      logger.info('[GitHubTokenManager] Successfully retrieved token from database');
      return cleanDecryptedToken;
    } catch (error) {
      logger.error('[GitHubTokenManager] Error getting token:', error);
      return this.handleRetry(userId, retryCount, 'unexpected error');
    }
  }

  private static async handleRetry(userId: string, retryCount: number, reason: string): Promise<string | null> {
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5 seconds

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
