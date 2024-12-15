'use client';

import { UserNav } from '@/components/user-nav';
import { UserProfile } from '@/components/layout/user-profile';

export function NavItems() {
  return (
    <nav className="flex items-center gap-4">
      <UserProfile />
      <UserNav />
    </nav>
  );
}