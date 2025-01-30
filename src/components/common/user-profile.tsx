import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/auth/supabase-client';
import { GitHubTokenManager } from '@/lib/auth/github-token-manager';
import { Button } from './button';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

interface AuthContext {
  user: User | null;
  loading: boolean;
}

export function UserProfile() {
  const navigate = useNavigate();
  const auth = useAuth() as AuthContext;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    try {
      // Clear GitHub tokens first
      if (auth.user?.id) {
        await GitHubTokenManager.clearToken(auth.user.id);
      }

      // Clear local storage
      localStorage.clear();

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Reload the page to reset all state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!auth.user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        className="flex items-center space-x-2"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <img
          src={auth.user.user_metadata?.avatar_url}
          alt={auth.user.user_metadata?.user_name || 'User avatar'}
          className="w-6 h-6 rounded-full"
        />
        <span className="text-sm font-medium">{auth.user.user_metadata?.user_name}</span>
      </Button>

      {isDropdownOpen && (
        <div className={cn(
          'absolute right-0 mt-2 w-48 rounded-md shadow-lg',
          'bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5'
        )}>
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={handleSignOut}
              className={cn(
                'block w-full px-4 py-2 text-sm text-left',
                'text-gray-700 dark:text-gray-200',
                'hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
