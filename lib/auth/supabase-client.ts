import { createClient } from '@supabase/supabase-js';
import { url, key } from './env';

let supabase = createClient(url, key);

export function getSupabaseClient() {
  return supabase;
}
