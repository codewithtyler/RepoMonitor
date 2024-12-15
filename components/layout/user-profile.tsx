'use client';

import { User } from 'lucide-react';
import { getSupabaseClient } from '@/lib/auth/supabase-client';
import { useUser } from '@/lib/auth/hooks';

export function UserProfile() {
  const { user, loading } = useUser();
  const supabase = getSupabaseClient();

  // Don't render anything if loading, no Supabase client, or no user
  if (loading || !supabase || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2">
      {user.user_metadata?.avatar_url ? (
        <img
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata?.name || 'User'}
          className="h-8 w-8 rounded-full"
        />
      ) : (
        <User className="h-8 w-8 p-1 rounded-full bg-muted" />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {user.user_metadata?.name || user.email}
        </span>
        <span className="text-xs text-muted-foreground">
          {user.user_metadata?.login || 'User'}
        </span>
      </div>
    </div>
  );
}