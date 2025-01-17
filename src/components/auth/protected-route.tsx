import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../common/loading-spinner';
import { useEffect, useState } from 'react';
import { subscribeToAuth, getAuthState } from '../../lib/auth/global-state';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(getAuthState());

  useEffect(() => {
    return subscribeToAuth(setState);
  }, []);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!state.user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
