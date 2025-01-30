import { useAuth } from '@/lib/contexts/auth-context';
import { useUser } from '@/lib/auth/hooks';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserProfile() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
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
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  // Get first name from user's full name
  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img
          src={user.user_metadata?.avatar_url}
          alt="Profile"
          className="w-6 h-6 rounded-full"
        />
        <span className="text-sm text-[#c9d1d9]">Hey {firstName}</span>
        <ChevronDown className="h-4 w-4 text-[#8b949e]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[#161b22] border border-[#30363d] shadow-lg overflow-hidden">
          <div className="py-2">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-[#f85149] hover:bg-[#21262d] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
