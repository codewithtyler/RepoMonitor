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
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-500/5 transition-colors"
      >
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={firstName}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm font-medium whitespace-nowrap" style={{ color: theme.colors.text.primary }}>
          Hey {firstName}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          style={{ color: theme.colors.text.secondary }}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1"
          style={{ backgroundColor: theme.colors.background.secondary }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.colors.border.primary }}>
            <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {state.user.email}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-500/5 transition-colors"
            style={{ color: theme.colors.text.primary }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
