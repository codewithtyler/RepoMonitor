import { RootProvider } from '@/components/layout/root-provider';
import { AppRoutes } from '@/components/layout/app-routes';
import { Toaster } from 'sonner';

export function App() {
  return (
    <RootProvider>
      <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
        <AppRoutes />
        <Toaster />
      </div>
    </RootProvider>
  );
}
