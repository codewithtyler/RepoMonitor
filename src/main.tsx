import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchProvider } from '@/lib/contexts/search-context';
import { AnalysisProvider } from '@/lib/contexts/analysis-context';
import { App } from './App';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false
    }
  }
});

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SearchProvider>
          <AnalysisProvider>
            <App />
          </AnalysisProvider>
        </SearchProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
