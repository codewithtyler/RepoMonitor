export function getServerUrl() {
  if (import.meta.env.VITE_URL) {
    return import.meta.env.VITE_URL;
  }
  return 'http://localhost:5173';
}