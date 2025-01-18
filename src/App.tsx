import { AppRouter } from './routes';
import { Toaster } from 'sonner';
import { SearchProvider } from './lib/contexts/search-context';
import { QueryClientProvider } from './lib/providers/query-client-provider';
import { MotionConfig, AnimatePresence } from 'framer-motion';
import { BrowserRouter } from 'react-router-dom';

export function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider>
        <SearchProvider>
          <MotionConfig reducedMotion="user">
            <AnimatePresence mode="wait">
              <AppRouter />
            </AnimatePresence>
          </MotionConfig>
        </SearchProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
