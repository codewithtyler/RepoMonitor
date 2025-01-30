import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HomeContainerProps {
  children?: ReactNode;
  className?: string;
}

export function HomeContainer({ className = '', children, ...props }: HomeContainerProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-16',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
