import { ReactNode } from 'react';

export type ToastProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'destructive';
  className?: string;
  children?: ReactNode;
};

export type ToastActionElement = React.ReactElement<{
  className?: string;
  onClick?: () => void;
}>;

export function Toast({
  open,
  onOpenChange,
  variant = 'default',
  className = '',
  children,
}: ToastProps) {
  if (!open) return null;

  return (
    <div
      role="alert"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-4 rounded-lg p-4 shadow-lg transition-all
        ${variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white'}
        ${className}`}
    >
      <div className="flex-1">{children}</div>
      {onOpenChange && (
        <button
          onClick={() => onOpenChange(false)}
          className="text-sm hover:opacity-80"
          aria-label="Close toast"
        >
          ✕
        </button>
      )}
    </div>
  );
} 