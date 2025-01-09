import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { QueryClientProvider } from './lib/providers/query-client-provider';
import { SearchProvider } from './lib/contexts/search-context';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider>
    <SearchProvider>
      <App />
    </SearchProvider>
  </QueryClientProvider>
);
