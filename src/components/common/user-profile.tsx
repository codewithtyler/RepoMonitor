import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { theme } from '@/config/theme';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthState } from '@/lib/auth/global-state';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = getAuthState();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  const firstName = user.user_metadata?.name?.split(' ')[0] || 'User';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-500/10"
        style={{ color: theme.colors.text.primary }}
      >
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${firstName}'s avatar`}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.colors.brand.primary }}
            >
              <User className="w-4 h-4" />
            </div>
          )}
          <span className="text-sm">Hey {firstName}</span>
        </div>
        <ChevronDown className="w-4 h-4" style={{ color: theme.colors.text.secondary }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 rounded-lg border shadow-lg"
            style={{
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.primary,
              zIndex: 9999
            }}
          >
            <div className="p-1">
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-gray-500/10"
                style={{ color: theme.colors.text.primary }}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-gray-500/10"
                style={{ color: theme.colors.text.primary }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
