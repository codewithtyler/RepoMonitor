import { useState, useEffect } from 'react';
import { getSupabaseClient } from './supabase-client';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const supabase = getSupabaseClient();
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/');
      }
      setLoading(false);
    };

    getUser();
    
    const supabase = getSupabaseClient();
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/');
        }
        setUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [router]);

  return { user, loading };
}