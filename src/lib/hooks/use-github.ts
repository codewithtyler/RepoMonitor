import { useCallback, useRef, useEffect, useState } from 'react';
import { getGitHubClient } from '../github';
import type { GitHubClient } from '@/lib/github';
import { toast } from 'sonner';
import { getAuthState, subscribeToAuth } from '../auth/global-state';

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

export function useGitHub() {
  const clientRef = useRef<GitHubClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const initAttempted = useRef(false);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      // Don't initialize if already initializing or already attempted
      if (!mounted || initAttempted.current) {
        return;
      }

      const { user } = getAuthState();
      if (!user) {
        return;
      }

      // Skip initialization on homepage
      if (window.location.pathname === '/') {
        return;
      }

      try {
        setIsInitializing(true);
        initAttempted.current = true;
        clientRef.current = await getGitHubClient(user.id);
      } catch (error) {
        console.error('Failed to initialize GitHub client:', error);
        clientRef.current = null;

        // Only show error and redirect if we're not on the homepage or callback page
        // and haven't attempted a redirect yet
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

    // Subscribe to auth changes
    unsubscribe = subscribeToAuth((state) => {
      // Only attempt initialization if we have a user and haven't tried before
      // and we're not on the homepage
      if (state.user && !initAttempted.current && !isInitializing && window.location.pathname !== '/') {
        initialize();
      } else if (!state.user) {
        // Reset state when user logs out
        clientRef.current = null;
        initAttempted.current = false;
        redirectAttempted.current = false;
      }
    });

    // Initial initialization attempt (skip on homepage)
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
    // Skip GitHub operations on homepage
    if (window.location.pathname === '/') {
      return null;
    }

    const { user } = getAuthState();

    if (!user) {
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

      // Only show error and redirect if we're not on the homepage or callback page
      // and haven't attempted a redirect yet
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
