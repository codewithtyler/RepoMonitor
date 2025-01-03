export function getBaseUrl() {
  if (import.meta.env.VITE_URL) {
    return import.meta.env.VITE_URL;
  }
  return window.location.origin;
}