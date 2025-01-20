import { useState, useEffect } from 'react';
import { AuthState, subscribeToAuth } from '@/lib/auth/global-state';
import { supabase } from '@/lib/auth/supabase-client';

export function UserProfile() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuth(setState);
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!state.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{state.user.email}</span>
      <button
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  );
}
