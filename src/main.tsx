import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { QueryClientProvider } from './lib/providers/query-client-provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider>
    <App />
  </QueryClientProvider>
);
