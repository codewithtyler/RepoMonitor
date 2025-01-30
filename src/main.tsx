import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchProvider } from '@/lib/contexts/search-context';
import { AnalysisProvider } from '@/lib/contexts/analysis-context';
import { ActiveAnalysesProvider } from '@/lib/contexts/active-analyses-context';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { GitHubProvider } from '@/lib/contexts/github-context';
import { App } from './App';
import './styles/index.css';

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  }
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(container);

root.render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <ActiveAnalysesProvider>
            <AnalysisProvider>
              <GitHubProvider>
                <SearchProvider>
                  <App />
                </SearchProvider>
              </GitHubProvider>
            </AnalysisProvider>
          </ActiveAnalysesProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
