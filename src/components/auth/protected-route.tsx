import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../lib/auth/hooks';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useUser();

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
}