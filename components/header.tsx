import { NavItems } from '@/components/layout/nav-items';
import { Github } from 'lucide-react';
import { HeaderLogo } from '@/components/layout/header-logo';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <HeaderLogo />
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search component will go here */}
          </div>
          <NavItems />
        </div>
      </div>
    </header>
  );
}