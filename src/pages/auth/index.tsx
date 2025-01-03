import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';
import { Github } from 'lucide-react';
import { theme } from '@/config/theme';
import type { Session } from '@supabase/supabase-js';

export function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  const handleGitHubSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Error signing in:', error.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: theme.colors.background.primary }}>
      <div className="w-full max-w-md space-y-8 rounded-lg p-6" style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="text-center">
          <h2 className="text-3xl font-bold" style={{ color: theme.colors.text.primary }}>
            Sign in to RepoMonitor
          </h2>
          <p className="mt-2 text-sm" style={{ color: theme.colors.text.secondary }}>
            Connect your GitHub account to get started
          </p>
        </div>

        <button
          onClick={handleGitHubSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors hover:bg-[#2ea043]"
          style={{ backgroundColor: theme.colors.brand.primary, color: theme.colors.text.primary }}
        >
          <Github className="h-5 w-5" />
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}