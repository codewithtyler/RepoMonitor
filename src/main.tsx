import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './routes';
import './styles/index.css';
import { SearchProvider } from './lib/contexts/search-context';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SearchProvider>
      <AppRouter />
    </SearchProvider>
  </React.StrictMode>
);
