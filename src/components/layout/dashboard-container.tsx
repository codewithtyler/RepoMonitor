import * as React from 'react';
import { HeaderLogo } from './header-logo';
import { theme } from '../../config/theme';
import { useUser } from '../../lib/auth/hooks';
import { ChevronDown, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/auth/supabase-client';
import { useNavigate } from 'react-router-dom';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const firstName = user?.user_metadata?.name?.split(' ')[0] || 'there';
  const avatarUrl = user?.user_metadata?.avatar_url;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: theme.colors.background.primary }}>
      {/* Sidebar */}
      <aside className="w-64 border-r" style={{
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary
      }}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <HeaderLogo />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b" style={{
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary
        }}>
          <div className="h-full px-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold" style={{ color: theme.colors.text.primary }}>
              Dashboard
            </h1>

            {/* Profile Section */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 rounded-full p-2 transition-colors hover:opacity-80"
                style={{ color: theme.colors.text.primary }}
              >
                <img
                  src={avatarUrl}
                  alt={firstName}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium">Hey {firstName}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg border py-1"
                  style={{
                    backgroundColor: '#111827',
                    borderColor: theme.colors.border.primary
                  }}
                >
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-sm transition-colors flex items-center text-gray-400 hover:text-white"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}