import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { GitHubTokenManager } from './github-token-manager';
import { logger } from '@/lib/utils/logger';
import { getAuthState, subscribeToAuth, type AuthState } from './global-state';

export function useSession() {
  const [state, setState] = useState<{
    session: Session | null;
    loading: boolean;
  }>({
    session: null,
    loading: true
  });

  useEffect(() => {
    let mounted = true;

    async function initState() {
      try {
        const authState = await getAuthState();
        if (!mounted) return;

        setState({
          session: authState.session,
          loading: authState.loading
        });

        if (authState.session?.provider_token && authState.user) {
          try {
            await GitHubTokenManager.storeToken(authState.user.id, authState.session.provider_token);
            logger.debug('[useSession] GitHub token stored successfully');
          } catch (tokenError) {
            logger.error('[useSession] Error storing token:', tokenError);
          }
        }
      } catch (error) {
        logger.error('[useSession] Error initializing state:', error);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    }

    initState();

    const unsubscribe = subscribeToAuth((authState: AuthState) => {
      if (!mounted) return;

      setState({
        session: authState.session,
        loading: authState.loading
      });

      if (authState.session?.provider_token && authState.user) {
        GitHubTokenManager.storeToken(authState.user.id, authState.session.provider_token)
          .catch(error => {
            logger.error('[useSession] Error storing token on auth change:', error);
          });
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}

export function useUser() {
  const [state, setState] = useState<{
    user: User | null;
    loading: boolean;
  }>({
    user: null,
    loading: true
  });

  useEffect(() => {
    let mounted = true;

    async function initState() {
      try {
        const authState = await getAuthState();
        if (!mounted) return;

        setState({
          user: authState.user,
          loading: authState.loading
        });
      } catch (error) {
        logger.error('[useUser] Error initializing state:', error);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    }

    initState();

    const unsubscribe = subscribeToAuth((authState: AuthState) => {
      if (!mounted) return;

      setState({
        user: authState.user,
        loading: authState.loading
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}
