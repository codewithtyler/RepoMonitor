import { NavItems } from '@/components/layout/nav-items';

export function Header() {
  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center px-6">
        <div className="ml-auto flex items-center gap-2">
          <NavItems />
        </div>
      </div>
    </header>
  );
}
