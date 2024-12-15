'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className={cn("min-h-screen bg-background antialiased")}>
        {children}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}