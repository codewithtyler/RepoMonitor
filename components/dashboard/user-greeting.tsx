'use client';

import { useUser } from '@/lib/auth/hooks';
import Image from 'next/image';

export function UserGreeting() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const firstName = user.user_metadata?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex items-center gap-3">
      {user.user_metadata?.avatar_url ? (
        <Image
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata?.name || 'User'}
          className="rounded-full"
          width={40}
          height={40}
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-medium text-primary">
            {firstName[0]}
          </span>
        </div>
      )}
      <span className="text-lg font-medium">
        Hey {firstName}!
      </span>
    </div>
  );
}
