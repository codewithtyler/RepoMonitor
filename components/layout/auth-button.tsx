'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Github } from 'lucide-react';
import { getSupabaseClient } from '@/lib/auth/supabase-client';
import { AUTH_ROUTES } from '@/lib/auth/constants';
import { getBaseUrl } from '@/lib/utils/url';

export function AuthButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseClient();
  const router = useRouter();
  const baseUrl = getBaseUrl();

  const handleLogin = async () => {
    if (!supabase) {
      setError('Authentication configuration error');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/github');
      const data = await response.json();
      
      if (data.error) {
        console.error('Auth error details:', data);
        throw new Error(data.details || data.error);
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize GitHub login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button className="btn btn-primary px-8 text-base opacity-50" disabled>
        <Github className="mr-2 h-5 w-5 animate-spin" />
        Loading...
      </button>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-destructive text-sm">
          {error}
        </div>
        <button 
          onClick={() => {
            setError(null);
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="space-y-2">
        <button 
          className="btn btn-primary px-8 text-base opacity-50 cursor-not-allowed"
          disabled
        >
          <Github className="mr-2 h-5 w-5" />
          GitHub Sign In Unavailable
        </button>
        <p className="text-sm text-destructive">
          Authentication configuration error
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleLogin}
        className="btn btn-primary px-8 text-base"
      >
        <Github className="mr-2 h-5 w-5" />
        Sign in with GitHub
      </button>
    </div>
  );
}