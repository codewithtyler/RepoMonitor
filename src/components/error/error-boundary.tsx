import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { theme } from '@/config/theme';
import { AlertCircle } from 'lucide-react';

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = '404 Not Found';
      message = 'The page you are looking for does not exist.';
    } else if (error.status === 401) {
      title = 'Unauthorized';
      message = 'You need to be logged in to access this page.';
    } else if (error.status === 403) {
      title = 'Forbidden';
      message = 'You do not have permission to access this page.';
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4" 
      style={{ backgroundColor: theme.colors.background.primary }}>
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto" style={{ color: theme.colors.text.error }} />
        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
          {title}
        </h1>
        <p className="text-lg" style={{ color: theme.colors.text.secondary }}>
          {message}
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: theme.colors.background.secondary, color: theme.colors.text.primary }}
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: theme.colors.brand.primary, color: theme.colors.text.primary }}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
} 