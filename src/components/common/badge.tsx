import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.

type BadgeVariant = 'default' | 'success' | 'warning' | 'error';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  onClick?: () => void;
}

export function Badge({
  className = '',
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-[#30363d] text-[#8b949e]',
    success: 'bg-[#238636] text-white',
    warning: 'bg-[#9e6a03] text-white',
    error: 'bg-[#f85149] text-white'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
