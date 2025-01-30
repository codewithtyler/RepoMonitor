import { AppRoutes } from '@/components/layout/app-routes';
import { Toaster } from 'sonner';

export function App() {
  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}
