import { logger } from './logger';

const GITHUB_TOKEN_COOKIE = 'gh_token';

export class CookieManager {
  static setCookie(name: string, value: string, options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
  } = {}) {
    try {
      const {
        maxAge = 3600 * 24, // 24 hours
        httpOnly = true,
        secure = true,
        sameSite = 'strict',
        path = '/'
      } = options;

      const cookie = [
        `${name}=${encodeURIComponent(value)}`,
        `max-age=${maxAge}`,
        `path=${path}`,
        httpOnly ? 'HttpOnly' : '',
        secure ? 'Secure' : '',
        `SameSite=${sameSite}`
      ].filter(Boolean).join('; ');

      document.cookie = cookie;
      logger.debug('[CookieManager] Cookie set successfully', { name });
    } catch (error) {
      logger.error('[CookieManager] Error setting cookie:', error);
      throw error;
    }
  }

  static getCookie(name: string): string | null {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
          return decodeURIComponent(cookieValue);
        }
      }
      return null;
    } catch (error) {
      logger.error('[CookieManager] Error getting cookie:', error);
      return null;
    }
  }

  static deleteCookie(name: string, path = '/') {
    try {
      document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      logger.debug('[CookieManager] Cookie deleted successfully', { name });
    } catch (error) {
      logger.error('[CookieManager] Error deleting cookie:', error);
    }
  }

  // Specific methods for GitHub token
  static setGitHubToken(token: string) {
    this.setCookie(GITHUB_TOKEN_COOKIE, token, {
      maxAge: 3600 * 24, // 24 hours
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/'
    });
  }

  static getGitHubToken(): string | null {
    return this.getCookie(GITHUB_TOKEN_COOKIE);
  }

  static clearGitHubToken() {
    this.deleteCookie(GITHUB_TOKEN_COOKIE);
  }
}
