import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CustomScrollbarProps {
    orientation?: 'vertical' | 'horizontal';
    children?: ReactNode;
    className?: string;
}

export const CustomScrollbar = forwardRef<HTMLDivElement, CustomScrollbarProps & React.HTMLAttributes<HTMLDivElement>>(
    ({ children, className = '', orientation = 'vertical', ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'scrollbar-thin scrollbar-track-transparent',
                    orientation === 'vertical' ? 'scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500' : '',
                    orientation === 'horizontal' ? 'scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500' : '',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

CustomScrollbar.displayName = 'CustomScrollbar';
