import { AppRouter } from './routes';
import { Toaster } from 'sonner';
import { MotionConfig, AnimatePresence } from 'framer-motion';
import { SearchProvider } from '@/lib/contexts/search-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SearchProvider>
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait">
            <AppRouter />
          </AnimatePresence>
        </MotionConfig>
        <Toaster position="bottom-right" />
      </SearchProvider>
    </QueryClientProvider>
  );
}
