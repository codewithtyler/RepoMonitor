import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './lib/contexts/auth-context';
import { ActiveAnalysesProvider } from './lib/contexts/active-analyses-context';
import { AnalysisProvider } from './lib/contexts/analysis-context';
import { GitHubProvider } from './lib/contexts/github-context';
import { SearchProvider } from './lib/contexts/search-context';
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
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
  </React.StrictMode>
);
