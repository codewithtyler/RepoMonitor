import { useUser } from '@/lib/auth/hooks';
import { supabase } from '@/lib/auth/supabase-client';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function NavItems() {
  const { user } = useUser();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || 'there';
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-full px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {firstName[0]}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Hey {firstName}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              handleSignOut();
              setIsOpen(false);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}