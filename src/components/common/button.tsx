import { ButtonHTMLAttributes, forwardRef } from 'react';
import { theme } from '@/config/theme';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', disabled, children, ...props }, ref) => {
    const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantStyles = {
      primary: {
        default: theme.colors.brand.primary,
        hover: theme.colors.brand.primary + 'dd',
        disabled: theme.colors.brand.primary + '99'
      },
      secondary: {
        default: theme.colors.background.secondary,
        hover: theme.colors.background.secondary + 'dd',
        disabled: theme.colors.background.secondary + '99'
      }
    };

    const styles = variantStyles[variant];

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${className}`}
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