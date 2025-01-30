import { ButtonHTMLAttributes, forwardRef } from 'react';
import { theme } from '@/config/theme';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.

const variantStyles = {
  primary: {
    default: '#238636',
    hover: '#2ea043',
    disabled: '#94d3a2',
  },
  secondary: {
    default: '#161b22',
    hover: '#30363d',
    disabled: '#8b949e',
  },
  outline: {
    default: 'transparent',
    hover: '#30363d',
    disabled: '#8b949e',
  },
} as const;

type ButtonVariant = keyof typeof variantStyles;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', disabled, children, ...props }, ref) => {
    const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    const styles = variantStyles[variant as ButtonVariant];
    const isOutline = variant === 'outline';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${isOutline ? 'border border-gray-300' : ''} ${className}`}
        disabled={disabled}
        style={{
          backgroundColor: disabled ? styles.disabled : styles.default,
          color: theme.colors.text.primary,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1
        }}
        {...props}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.target as HTMLButtonElement).style.backgroundColor = styles.hover;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            (e.target as HTMLButtonElement).style.backgroundColor = styles.default;
          }
        }}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
