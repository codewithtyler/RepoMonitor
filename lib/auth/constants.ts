/**
 * Authentication routes used throughout the application
 */
export const AUTH_ROUTES = {
  CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  HOME: '/',
  GITHUB: '/api/auth/github',
} as const;

/**
 * Authentication error messages
 */
export const AUTH_ERRORS = {
  CONFIG_ERROR: 'Authentication configuration error',
  NO_CODE: 'No authorization code received',
  OAUTH_FAILED: 'OAuth initialization failed',
  SESSION_ERROR: 'Session creation failed',
  UNEXPECTED: 'An unexpected authentication error occurred',
} as const;