import { useEffect, useState, useRef } from 'react';
import { redirect, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@/lib/auth/hooks';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { getAuthState } from '@/lib/auth/global-state';
import { GitHubTokenManager } from '@/lib/auth/github-token-manager';

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
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const redirectAttemptedRef = useRef(false);
  const { user, loading } = useUser();
  const tokenCheckAttempts = useRef(0);
  const maxAttempts = 5;

  useEffect(() => {
    let mounted = true;
    let tokenCheckTimeout: NodeJS.Timeout;

    async function checkForToken() {
      if (!user || tokenCheckAttempts.current >= maxAttempts) return;

      try {
        const providerToken = user.app_metadata?.provider_token;
        if (providerToken) {
          logger.debug('[AuthCallback] Found provider token, storing...');
          await GitHubTokenManager.storeToken(user.id, providerToken);
          if (mounted) {
            setStatus('Redirecting to dashboard...');
            redirectAttemptedRef.current = true;
            navigate('/dashboard', { replace: true });
          }
        } else {
          tokenCheckAttempts.current++;
          if (tokenCheckAttempts.current < maxAttempts) {
            setStatus('Completing GitHub authentication...');
            tokenCheckTimeout = setTimeout(checkForToken, 2000);
          } else if (mounted) {
            setError('Unable to complete GitHub authentication. Please try again.');
            setTimeout(() => navigate('/', { replace: true }), 3000);
          }
        }
      } catch (error) {
        logger.error('[AuthCallback] Error checking token:', error);
        if (mounted) {
          setError('Error processing authentication. Please try again.');
          setTimeout(() => navigate('/', { replace: true }), 3000);
        }
      }
    }

    async function handleCallback() {
      if (redirectAttemptedRef.current) return;

      try {
        if (loading) {
          setStatus('Loading user state...');
          return;
        }

        if (!user) {
          setStatus('Completing authentication...');
          return;
        }

        setStatus('Connecting to GitHub...');
        checkForToken();
      } catch (error) {
        logger.error('[AuthCallback] Error in callback:', error);
        if (mounted) {
          setStatus('Authentication failed');
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
          setTimeout(() => navigate('/', { replace: true }), 3000);
        }
      }
    }

    handleCallback();

    return () => {
      mounted = false;
      if (tokenCheckTimeout) {
        clearTimeout(tokenCheckTimeout);
      }
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
