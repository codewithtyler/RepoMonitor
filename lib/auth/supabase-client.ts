import { createClient } from '@supabase/supabase-js';
import { url, key } from './env';

export const supabase = createClient(url, key);

export function getSupabaseClient() {
  return supabase;
}
