import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', disabled = false, children, ...props }, ref) => {
    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline'
    };

    const sizeClasses: Record<ButtonSize, string> = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10'
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant as ButtonVariant],
          sizeClasses[size as ButtonSize],
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
