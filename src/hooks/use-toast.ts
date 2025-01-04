import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function toast({ title, description, variant = 'default' }: ToastProps) {
  const options = {
    style: {
      background: variant === 'destructive' ? '#dc2626' : '#1e293b',
      color: '#f8fafc',
      border: 'none',
    },
  };

  sonnerToast(title, {
    description,
    ...options,
  });
} 