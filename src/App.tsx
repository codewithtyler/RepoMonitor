import { AppRouter } from './routes';
import { Toaster } from 'sonner';

export function App() {
  return (
    <>
      <AppRouter />
      <Toaster position="top-right" />
    </>
  );
}
