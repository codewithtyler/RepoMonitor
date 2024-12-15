'use client';

import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/auth/supabase-client';

export function UserNav() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Unable to sign out: Supabase client not initialized');
      return;
    }
    
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="relative">
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}