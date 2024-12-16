import { Home, Settings, GitPullRequest, Search } from 'lucide-react';
import Link from 'next/link';
import { HeaderLogo } from '@/components/layout/header-logo';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Issues', href: '/dashboard/issues', icon: GitPullRequest },
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="w-64 border-r border-gray-700 bg-[#1f2937] flex flex-col">
      <div className="h-14 border-b border-gray-700 flex items-center px-4">
        <HeaderLogo />
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-1 p-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
