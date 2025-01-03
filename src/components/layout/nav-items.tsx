import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/auth/supabase-client';
import { theme } from '@/config/theme';

export function NavItems() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <nav className="flex items-center space-x-4">
      <Link
        to="/dashboard"
        className="text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: theme.colors.text.primary }}
      >
        Dashboard
      </Link>
      <button
        onClick={() => handleSignOut()}
        className="flex items-center text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: theme.colors.text.secondary }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </button>
    </nav>
  );
}