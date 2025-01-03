import * as React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';

interface RootProviderProps {
  children: React.ReactNode;
}

export function RootProvider({ children }: RootProviderProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <div className={cn("min-h-screen bg-background antialiased")}>
        {children}
      </div>
      <Toaster />
    </ThemeProvider>
  );
} 