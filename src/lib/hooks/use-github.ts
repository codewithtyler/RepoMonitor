import { useCallback, useRef, useEffect, useState } from 'react';
import { getGitHubClient } from '../github';
import type { GitHubClient } from '@/lib/github';
import { toast } from 'sonner';
import { getAuthState, subscribeToAuth } from '../auth/global-state';
import { useQuery } from '@tanstack/react-query';

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

export function useGitHub() {
  return useQuery({
    queryKey: ['github'],
    queryFn: async () => {
      const state = await getAuthState();
      if (!state.user) {
        throw new Error('User must be authenticated');
      }

      const client = await getGitHubClient(state.user.id);
      return client;
    }
  });
}

export function useGitHubUser() {
  return useQuery({
    queryKey: ['github-user'],
    queryFn: async () => {
      const state = await getAuthState();
      if (!state.user) {
        throw new Error('User must be authenticated');
      }
      return state.user;
    }
  });
}

export function useGitHubOld() {
  const clientRef = useRef<GitHubClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const initAttempted = useRef(false);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      if (!mounted || initAttempted.current) {
        return;
      }

      const state = await getAuthState();
      if (!state.user) {
        return;
      }

      if (window.location.pathname === '/') {
        return;
      }

      try {
        setIsInitializing(true);
        initAttempted.current = true;
        clientRef.current = await getGitHubClient(state.user.id);
      } catch (error) {
        console.error('Failed to initialize GitHub client:', error);
        clientRef.current = null;

        if (mounted &&
          window.location.pathname !== '/' &&
          !window.location.pathname.includes('/auth/callback') &&
          !redirectAttempted.current) {
          redirectAttempted.current = true;
          toast.error('GitHub authentication required');
          window.location.href = '/';
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    unsubscribe = subscribeToAuth(async (state) => {
      if (state.user && !initAttempted.current && !isInitializing && window.location.pathname !== '/') {
        await initialize();
      } else if (!state.user) {
        clientRef.current = null;
        initAttempted.current = false;
        redirectAttempted.current = false;
      }
    });

    if (window.location.pathname !== '/') {
      initialize();
    }

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      clientRef.current = null;
      initAttempted.current = false;
      redirectAttempted.current = false;
    };
  }, []);

  const withGitHub = useCallback(async <T>(fn: (client: GitHubClient) => Promise<T>): Promise<T | null> => {
    if (window.location.pathname === '/') {
      return null;
    }

    const state = await getAuthState();

    if (!state.user) {
      if (!redirectAttempted.current && !window.location.pathname.includes('/auth/callback')) {
        redirectAttempted.current = true;
        toast.error('Authentication required');
        window.location.href = '/';
      }
      return null;
    }

    if (isInitializing) {
      return null;
    }

    try {
      if (!clientRef.current) {
        throw new Error('GitHub client not initialized');
      }
      return await fn(clientRef.current);
    } catch (error) {
      console.error('GitHub API error:', error);

      if (!redirectAttempted.current &&
        window.location.pathname !== '/' &&
        !window.location.pathname.includes('/auth/callback')) {
        redirectAttempted.current = true;
        toast.error('Failed to access GitHub API');
        window.location.href = '/';
      }
      return null;
    }
  }, [isInitializing]);

  return { withGitHub, isInitializing };
}
