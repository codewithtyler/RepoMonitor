import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

let supabase: ReturnType<typeof createClientComponentClient> | null = null;

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createClientComponentClient();
  }
  return supabase;
}
