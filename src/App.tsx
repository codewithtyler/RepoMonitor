import { AppRouter } from './routes';
import { Toaster } from 'sonner';
import { SearchProvider } from './lib/contexts/search-context'

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
