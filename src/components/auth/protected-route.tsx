import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../lib/auth/hooks';
import { LoadingSpinner } from '../common/loading-spinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}