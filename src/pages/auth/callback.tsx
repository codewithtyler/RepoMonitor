import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/auth/supabase-client';
import { GitHubTokenManager } from '../../lib/auth/github-token-manager';
import { theme } from '@/config/theme';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) throw new Error('No session found');

        // Get the GitHub token from the session
        const githubToken = session.provider_token;
        const userId = session.user.id;

        if (!githubToken) {
          throw new Error('No GitHub token found in session');
        }

        // Use the token manager to handle the OAuth token
        await GitHubTokenManager.handleOAuthToken(githubToken, userId);

        // Navigate to the dashboard on success
        navigate('/dashboard');
      } catch (err) {
        console.error('Error in callback:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div style={{ color: theme.colors.error.primary, padding: '20px' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      Logging you in...
    </div>
  );
}