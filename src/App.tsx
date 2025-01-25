import { AppRouter } from './routes';
import { Toaster } from 'sonner';
import { MotionConfig, AnimatePresence } from 'framer-motion';

export function App() {
  return (
    <>
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait">
          <AppRouter />
        </AnimatePresence>
      </MotionConfig>
      <Toaster position="bottom-right" />
    </>
  );
}
