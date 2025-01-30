import { useEffect, useState, useRef } from 'react';
import { redirect, useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/auth/hooks';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { getAuthState } from '@/lib/auth/global-state';

export async function loader() {
  logger.debug('[Auth Loader] Starting loader function');
  const authState = await getAuthState();

  if (!authState.user) {
    logger.debug('[Auth Loader] No user found, redirecting to home');
    return redirect('/');
  }
  return null;
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const redirectAttemptedRef = useRef(false);
  const { user, loading } = useUser();

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      if (redirectAttemptedRef.current) {
        logger.debug('[AuthCallback] Redirect already attempted, skipping');
        return;
      }

      try {
        logger.debug('[AuthCallback] Starting callback handler', { loading, hasUser: !!user });
        if (mounted) setStatus('Starting authentication...');

        if (loading) {
          logger.debug('[AuthCallback] Still loading user state');
          if (mounted) setStatus('Loading user state...');
          return;
        }

        if (!user) {
          logger.debug('[AuthCallback] No user found after loading');
          if (mounted) {
            setStatus('No user found, redirecting...');
            setError('Authentication failed - no user found');
          }
          redirectAttemptedRef.current = true;
          await new Promise(resolve => setTimeout(resolve, 2000));
          navigate('/', { replace: true });
          return;
        }

        logger.debug('[AuthCallback] User found:', {
          id: user.id,
          provider: user.app_metadata?.provider
        });

        if (mounted) setStatus('Authenticating with GitHub...');

        // Store the token if available
        if (user.app_metadata?.provider === 'github') {
          const providerToken = user.app_metadata.provider_token;
          if (providerToken) {
            logger.debug('[AuthCallback] Storing GitHub token');
            await GitHubTokenManager.storeToken(user.id, providerToken);
            if (mounted) setStatus('GitHub token stored successfully');
          } else {
            logger.warn('[AuthCallback] No provider token found in user metadata');
            if (mounted) {
              setError('No GitHub access token found');
              setStatus('Authentication failed');
              redirectAttemptedRef.current = true;
              await new Promise(resolve => setTimeout(resolve, 2000));
              navigate('/', { replace: true });
              return;
            }
          }
        } else {
          logger.warn('[AuthCallback] User not authenticated through GitHub');
          if (mounted) {
            setError('Not authenticated through GitHub');
            setStatus('Authentication failed');
            redirectAttemptedRef.current = true;
            await new Promise(resolve => setTimeout(resolve, 2000));
            navigate('/', { replace: true });
            return;
          }
        }

        // Redirect to dashboard
        logger.debug('[AuthCallback] Authentication successful, redirecting to dashboard');
        if (mounted) setStatus('Redirecting to dashboard...');
        redirectAttemptedRef.current = true;
        navigate('/dashboard', { replace: true });
      } catch (error) {
        logger.error('[AuthCallback] Error in callback:', error);
        if (mounted) {
          setStatus('Authentication failed');
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
        }
      }
    }

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0d1117]">
      <div className="max-w-md w-full rounded-lg border border-[#30363d] shadow-lg p-6 bg-[#161b22]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#238636]" />
          <h2 className="text-xl font-semibold text-[#c9d1d9]">
            {status}
          </h2>
          {error && (
            <div className="text-sm text-center mt-2 text-[#f85149]">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
