import * as React from 'react';
import { cn } from '../../lib/utils';
import { Footer } from './footer';

export function HomeContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "flex min-h-screen flex-col",
      "px-4 py-8 md:px-6 lg:px-8"
    )}>
      <div className="flex-1 w-full flex flex-col items-center">
        {children}
      </div>
      <Footer />
    </div>
  );
}