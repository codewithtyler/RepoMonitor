export const GITHUB_SCOPES = ['repo', 'user'];

export const API_RATE_LIMITS = {
  GITHUB: 5000,
  OPENAI: 3000,
} as const;

export const CACHE_TTL = {
  REPOSITORY: 5 * 60, // 5 minutes
  USER: 60 * 60, // 1 hour
  ISSUES: 5 * 60, // 5 minutes
} as const;

export const EMBEDDING_CONFIG = {
  BATCH_SIZE: 50,
  SIMILARITY_THRESHOLD: 0.85,
  MAX_RESULTS: 5,
} as const;

export const AUTH_ERRORS = {
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',
  UNAUTHORIZED: 'Unauthorized access',
} as const;