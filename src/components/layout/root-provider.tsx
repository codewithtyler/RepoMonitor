import * as React from 'react';
import { Toaster } from 'sonner';

interface RootProviderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function RootProvider({ className = '', ...props }: RootProviderProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`} {...props}>
      <Toaster />
    </div>
  );
}