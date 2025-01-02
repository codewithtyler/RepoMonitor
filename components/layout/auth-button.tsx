'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/auth/supabase-client';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#f0f6fc" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

export { AuthButton };

function AuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseClient();

  async function signInWithGithub() {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'read:user user:email'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!supabase) {
    return (
      <button className="btn btn-primary px-8 text-base" disabled>
        <GitHubIcon className="mr-2 h-5 w-5 text-white" />
        GitHub Sign In Unavailable
      </button>
    );
  }

  return (
    <div className="flex justify-center w-full">
      <button
        onClick={signInWithGithub}
        className="btn btn-primary px-8 text-base flex items-center justify-center"
        disabled={isLoading}
      >
        <GitHubIcon className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Loading...' : 'Sign in with GitHub'}
      </button>
    </div>
  );
}
