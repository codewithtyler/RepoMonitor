import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/dashboard-container';
import { Home } from '../pages/Home';
import { Dashboard } from '../pages/Dashboard';
import { AuthCallback } from '../pages/auth/callback';
import { AnalyzePage } from '../pages/analyze/[owner]/[repo]';
import { TrackedPage } from '../pages/tracked';
import { ProtectedRoute } from '../components/auth/protected-route';
import { ErrorBoundary } from '../components/error/error-boundary';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <ErrorBoundary />
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
    errorElement: <ErrorBoundary />
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '/tracked',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <TrackedPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '/analyze/:owner/:repo',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <AnalyzePage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
    errorElement: <ErrorBoundary />
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}