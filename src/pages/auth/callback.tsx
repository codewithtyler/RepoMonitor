import { useEffect, useState } from 'react';
import { redirect } from 'react-router-dom';
import { supabase } from '../../lib/auth/supabase-client';
import { GitHubTokenManager } from '../../lib/auth/github-token-manager';
import { useUser } from '../../lib/auth/hooks';
import { Loader2 } from 'lucide-react';
import { theme } from '@/config/theme';

export async function loader() {
  console.log('[Auth Loader] Starting loader function');
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[Auth Loader] Error getting session:', error);
  }

  if (!session?.user) {
    console.log('[Auth Loader] No session found, redirecting to home');
    return redirect('/');
  }
  return null;
}

export function AuthCallback() {
  const { user, loading } = useUser();
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth] Starting callback handler');
        setStatus('Starting authentication...');

        if (loading) {
          console.log('[Auth] Waiting for user state...');
          setStatus('Loading user state...');
          return;
        }

        if (!user) {
          console.log('[Auth] No user found');
          setStatus('No user found, redirecting...');
          setError('Authentication failed - no user found');
          await new Promise(resolve => setTimeout(resolve, 2000));
          window.location.href = '/';
          return;
        }

        console.log('[Auth] User found:', {
          id: user.id,
          email: user.email,
          provider: user.app_metadata?.provider
        });
        setStatus('User authenticated, getting session...');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
          setError(`Session error: ${sessionError.message}`);
          throw sessionError;
        }

        if (!session?.provider_token) {
          console.error('[Auth] No provider token in session');
          setStatus('Missing provider token...');
          setError('No GitHub access token found');
          await new Promise(resolve => setTimeout(resolve, 2000));
          window.location.href = '/';
          return;
        }

        setStatus('Storing GitHub token...');
        await GitHubTokenManager.handleOAuthToken(session.provider_token, user.id);
        console.log('[Auth] Token stored successfully');

        setStatus('Success! Redirecting to dashboard...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Redirect back to the local dashboard
        window.location.href = `${window.location.origin}/dashboard`;
      } catch (err) {
        console.error('[Auth] Error in callback:', err);
        setStatus('Error occurred during authentication');
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        await new Promise(resolve => setTimeout(resolve, 2000));
        window.location.href = '/';
      }
    };

    if (!loading) {
      handleCallback();
    }
  }, [user, loading]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{ backgroundColor: theme.colors.background.primary }}
    >
      <div
        className="max-w-md w-full rounded-lg border shadow-lg p-6"
        style={{
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary
        }}
      >
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.brand.primary }} />
          <h2
            className="text-xl font-semibold"
            style={{ color: theme.colors.text.primary }}
          >
            {status}
          </h2>
          {error && (
            <div className="text-sm text-center mt-2" style={{ color: theme.colors.text.error }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
