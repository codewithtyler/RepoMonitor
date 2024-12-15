import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('Supabase credentials not found');
    return null;
  }
  
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}