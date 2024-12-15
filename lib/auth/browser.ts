/**
 * Check if code is running in browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Get browser-specific configuration
 */
export function getBrowserConfig() {
  if (!isBrowser) {
    return {
      hostname: '',
      protocol: 'https:',
      localStorage: undefined,
    };
  }

  return {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    localStorage: window.localStorage,
  };
}