import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/dashboard-container';
import { HomePage } from '../pages/Home';
import { DashboardPage } from '../pages/Dashboard';
import { AuthCallback } from '@/pages/auth/callback';
import { ProtectedRoute } from '@/components/auth/protected-route';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <DashboardPage />
        </DashboardLayout>
      </ProtectedRoute>
    )
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}