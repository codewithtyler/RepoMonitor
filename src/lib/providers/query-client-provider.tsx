import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryClientProviderProps {
    children: ReactNode;
}

const queryClientOptions = {
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes
            refetchOnWindowFocus: false,
            retry: false,
            // Add hydration options
            enabled: typeof window !== 'undefined', // Only run queries on client side
        },
    },
};

export function QueryClientProvider({ children }: QueryClientProviderProps) {
    console.log('[QueryClientProvider] Initializing');

    const [queryClient] = useState(
        () => {
            console.log('[QueryClientProvider] Creating new QueryClient');
            return new QueryClient(queryClientOptions);
        }
    );

    console.log('[QueryClientProvider] Rendering with queryClient:', !!queryClient);

    return (
        <TanstackQueryClientProvider client={queryClient}>
            {children}
        </TanstackQueryClientProvider>
    );
}
