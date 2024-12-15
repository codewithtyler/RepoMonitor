import { CACHE_TTL } from './constants';

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000
): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry<T>(url, options, retries - 1, backoff * 2);
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