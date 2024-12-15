import { Home, Settings, GitPullRequest, Search } from 'lucide-react';
import Link from 'next/link';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Issues', href: '/dashboard/issues', icon: GitPullRequest },
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
        <nav className="flex flex-1 flex-col pt-8">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-foreground hover:bg-muted"
                    >
                      <item.icon
                        className="h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}