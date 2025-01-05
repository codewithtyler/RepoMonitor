import { theme } from '@/config/theme';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border ${className}`}
      style={{ 
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: CardProps) {
  return (
    <h3 
      className={`text-sm font-medium ${className}`}
      style={{ color: theme.colors.text.primary }}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }: CardProps) {
  return (
    <p 
      className={`${className}`}
      style={{ color: theme.colors.text.secondary }}
      {...props}
    >
      {children}
    </p>
  );
} 