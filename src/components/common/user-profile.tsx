import { useState, useEffect, useRef } from 'react';
import { AuthState, subscribeToAuth } from '@/lib/auth/global-state';
import { supabase } from '@/lib/auth/supabase-client';
import { ChevronDown } from 'lucide-react';

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
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium whitespace-nowrap text-[#c9d1d9]">
            Hey {firstName}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 text-[#c9d1d9] ${showDropdown ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {showDropdown && (
        <div
          className="absolute right-4 mt-2 w-48 rounded-lg shadow-lg py-1 bg-[#161b22]"
        >
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/10 transition-colors text-[#f85149]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
