import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getAuthState, subscribeToAuth } from './global-state';

export function useUser() {
  const [{ user, loading }, setState] = useState(getAuthState());

  useEffect(() => {
    return subscribeToAuth(setState);
  }, []);

  return { user, loading };
}
