'use client';

import { useState } from 'react';
import { Github } from 'lucide-react';
import { getSupabaseClient } from '@/lib/auth/supabase-client';

export function AuthButton() {
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
        <Github className="mr-2 h-5 w-5" />
        GitHub Sign In Unavailable
      </button>
    );
  }

  return (
    <button
      onClick={signInWithGithub}
      className="btn btn-primary px-8 text-base"
      disabled={isLoading}
    >
      <Github className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Loading...' : 'Sign in with GitHub'}
    </button>
  );
}
