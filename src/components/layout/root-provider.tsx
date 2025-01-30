import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { GitHubProvider } from '@/lib/contexts/github-context';
import { SearchProvider } from '@/lib/contexts/search-context';
import { AnalysisProvider } from '@/lib/contexts/analysis-context';
import { ActiveAnalysesProvider } from '@/lib/contexts/active-analyses-context';
import { AuthProvider } from '@/lib/contexts/auth-context';

interface RootProviderProps {
  children: ReactNode;
}

export function RootProvider({ children }: RootProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GitHubProvider>
          <SearchProvider>
            <AnalysisProvider>
              <ActiveAnalysesProvider>
                {children}
              </ActiveAnalysesProvider>
            </AnalysisProvider>
          </SearchProvider>
        </GitHubProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
