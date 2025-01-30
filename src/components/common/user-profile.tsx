import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';
import { useUser } from '@/lib/auth/hooks';
import { ChevronDown } from 'lucide-react';

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear any local storage data
      localStorage.clear();

      // Navigate to home page
      navigate('/');

      // Close the dropdown
      setIsOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  // Get first name from full name
  const firstName = user.user_metadata.full_name.split(' ')[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-[#c9d1d9] hover:opacity-80 transition-opacity"
      >
        <img
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata.full_name}
          className="w-6 h-6 rounded-full"
        />
        <span className="text-sm font-medium whitespace-nowrap">Hey {firstName}!</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-[#21262d] border border-[#30363d] z-50">
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-sm text-left text-[#f85149] hover:bg-[#f8514910] rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
