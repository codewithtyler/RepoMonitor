export function getBaseUrl() {
  // Use environment variable if set (recommended for production)
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }

  // Fallback to window.location in the browser
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Default fallback for SSR
  return 'http://localhost:3000';
}