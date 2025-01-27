import { useState, useEffect, useRef } from 'react';
import { AuthState, subscribeToAuth } from '@/lib/auth/global-state';
import { supabase } from '@/lib/auth/supabase-client';
import { theme } from '@/config/theme';

export function UserProfile() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(setState);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!state.user) {
    return null;
  }

  const firstName = state.user.user_metadata?.full_name?.split(' ')[0] || 'User';
  const avatarUrl = state.user.user_metadata?.avatar_url;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-500/5 transition-colors"
      >
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={firstName}
            className="w-8 h-8 rounded-full"
          />
        )}
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg py-2"
          style={{ backgroundColor: theme.colors.background.secondary }}
        >
          <div className="px-4 py-2 border-b" style={{ borderColor: theme.colors.border.primary }}>
            <div className="flex items-center gap-3">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={firstName}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <div className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
                  Hey, {firstName}!
                </div>
                <div className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  {state.user.email}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-500/5 transition-colors"
              style={{ color: theme.colors.text.primary }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
