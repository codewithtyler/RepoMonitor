export function getServerBaseUrl() {
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return 'http://localhost:3000';
}