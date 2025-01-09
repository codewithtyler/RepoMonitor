import { useCallback, useRef, useEffect } from 'react';
import { getGitHubClient } from '../github';
import type { GitHubClient } from '@/lib/github';
import { toast } from 'sonner';
import { getAuthState, subscribeToAuth } from '../auth/global-state';

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

export function useGitHub() {
  const clientRef = useRef<GitHubClient | null>(null);
  const authAttempted = useRef(false);

  useEffect(() => {
    // Initialize client when auth state changes
    const unsubscribe = subscribeToAuth(async ({ user }) => {
      if (user && !clientRef.current) {
        try {
          clientRef.current = await getGitHubClient(user.id);
        } catch (error) {
          console.error('Failed to initialize GitHub client:', error);
          clientRef.current = null;
        }
      } else if (!user) {
        clientRef.current = null;
      }
    });

    return () => {
      unsubscribe();
      clientRef.current = null;
    };
  }, []);

  const withGitHub = useCallback(async <T>(fn: (client: GitHubClient) => Promise<T>): Promise<T | null> => {
    const { user } = getAuthState();

    if (!user) {
      if (!authAttempted.current) {
        authAttempted.current = true;
        toast.error('Authentication required');
        window.location.href = '/';
      }
      return null;
    }

    try {
      if (!clientRef.current) {
        clientRef.current = await getGitHubClient(user.id);
      }
      return await fn(clientRef.current);
    } catch (error) {
      console.error('GitHub API error:', error);
      clientRef.current = null;

      if (!authAttempted.current) {
        authAttempted.current = true;
        toast.error('Failed to access GitHub API');
        window.location.href = '/';
      }
      return null;
    }
  }, []); // No dependencies since we use global state and refs

  return { withGitHub };
}
