import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/auth/hooks';
import { Loader2 } from 'lucide-react';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

// Using getAuthState() from global-state instead of useUser() hook
// to prevent multiple Supabase requests across components.
// This ensures all components share the same auth state.

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Pass the current location as state to redirect back after login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
