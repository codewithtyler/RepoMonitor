'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/auth/supabase-client';
import { AUTH_ROUTES } from '@/lib/auth/constants';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.push('/');
      return;
    }

    // Let Supabase handle the auth state from the URL
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth error:', error);
        router.push('/');
        return;
      }

      const next = searchParams.get('next') || AUTH_ROUTES.DASHBOARD;
      router.push(next);
    });
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Completing sign in...</h2>
        <p className="text-muted-foreground">You will be redirected shortly.</p>
      </div>
    </div>
  );
}