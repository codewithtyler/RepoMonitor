import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session);
      if (session) {
        console.log('Session exists, redirecting to dashboard...');
        navigate('/dashboard', { replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth State Change:', {
        event,
        user: session?.user,
        metadata: session?.user?.user_metadata,
        provider: session?.user?.app_metadata?.provider
      });

      if (event === 'SIGNED_IN') {
        console.log('SIGNED_IN event detected, redirecting to dashboard...');
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Completing sign in...
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please wait while we verify your credentials.
        </p>
      </div>
    </div>
  );
} 