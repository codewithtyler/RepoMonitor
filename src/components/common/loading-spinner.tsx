// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.

import { Loader2 } from 'lucide-react';
import { theme } from '@/config/theme';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 24, className = '' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Loader2
        className={`animate-spin ${className}`}
        size={size}
        style={{ color: theme.colors.text.primary }}
      />
    </div>
  );
}
