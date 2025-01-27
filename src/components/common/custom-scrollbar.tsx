import { forwardRef } from 'react';
import { theme } from '@/config/theme';

interface CustomScrollbarProps extends React.HTMLProps<HTMLDivElement> {
    children: React.ReactNode;
}

export const CustomScrollbar = forwardRef<HTMLDivElement, CustomScrollbarProps>(
    ({ children, className = '', ...props }, ref) => {
        const scrollbarStyle = {
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.colors.border.primary} transparent`,
            '&::-webkit-scrollbar': {
                width: '6px',
            },
            '&::-webkit-scrollbar-track': {
                background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.colors.border.primary,
                borderRadius: '3px',
            },
        } as React.CSSProperties;

        return (
            <div
                ref={ref}
                className={`${className}`}
                style={{ ...scrollbarStyle, ...props.style }}
                {...props}
            >
                {children}
            </div>
        );
    }
);
