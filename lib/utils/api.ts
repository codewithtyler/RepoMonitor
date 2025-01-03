import { CACHE_TTL } from './constants';
import { getBaseUrl } from './url';

export async function fetchWithRetry<T>(
  url: string,
  options: globalThis.RequestInit = {},
  retries = 3
): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export function createCacheKey(...parts: (string | number)[]) {
  return parts.join(':');
}

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL.REPOSITORY
): Promise<T> {
  const cached = await localStorage.getItem(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ttl * 1000) {
      return data as T;
    }
  }
  
  const fresh = await fetcher();
  await localStorage.setItem(
    key,
    JSON.stringify({ data: fresh, timestamp: Date.now() })
  );
  return fresh;
}

export async function fetchApi(path: string, init?: globalThis.RequestInit) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}