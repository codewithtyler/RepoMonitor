'use client';

import { useUser } from '@/lib/auth/hooks';
import { getSupabaseClient } from '@/lib/auth/supabase-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { LogOut } from 'lucide-react';

export function NavItems() {
  const { user } = useUser();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || 'there';

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase?.auth.signOut();
  };

  return (
    <div className="mr-8">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-full px-2 py-1.5 hover:bg-muted/50 outline-none">
          <div className="flex items-center gap-3">
            {user?.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.name || 'User'}
                className="rounded-full"
                width={28}
                height={28}
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium">
                  {firstName[0]}
                </span>
              </div>
            )}
            <span className="text-sm font-medium">Hey {firstName}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
