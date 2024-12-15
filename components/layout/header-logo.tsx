'use client';

import { Github } from 'lucide-react';
import Link from 'next/link';

export function HeaderLogo() {
  return (
    <div className="mr-4 flex">
      <Link href="/" className="flex items-center space-x-2">
        <Github className="h-6 w-6 text-primary" />
        <span className="font-bold">RepoMonitor</span>
      </Link>
    </div>
  );
}