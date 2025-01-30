import { AppRouter } from './routes';
import { Toaster } from 'sonner';
import { MotionConfig } from 'framer-motion';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
        <AppRouter />
        <Toaster
          position="bottom-right"
          theme="dark"
          closeButton
          richColors
        />
      </div>
    </MotionConfig>
  );
}
