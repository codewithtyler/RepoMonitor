import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { AuthCallback } from '../pages/auth/callback';
import { Home } from '../pages/Home';
import { Repository } from '../pages/Repository';
import { AnalyzePage } from '../pages/analyze/[owner]/[repo]';
import { getAuthState, subscribeToAuth, type AuthState } from '../lib/auth/global-state';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth/supabase-client';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, session: null });
  const location = useLocation();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        // Check session first
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
          // No session, redirect to home with return path
          window.location.href = `/?returnTo=${encodeURIComponent(location.pathname)}`;
          return;
        }

        // Get full auth state
        const initialState = await getAuthState();
        setState(initialState);

        // Subscribe to auth changes
        unsubscribe = subscribeToAuth((newState) => {
          setState(newState);
          if (!newState.user) {
            // Lost auth during session, redirect to home
            window.location.href = '/';
          }
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, redirect to home
        window.location.href = '/';
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [location.pathname]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!state.user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Public routes that should redirect to dashboard if already authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, session: null });

  useEffect(() => {
    const checkAuth = async () => {
      const authState = await getAuthState();
      setState(authState);
    };

    checkAuth();
  }, []);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (state.user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/repository/:owner/:name" element={<ProtectedRoute><Repository /></ProtectedRoute>} />
      <Route path="/analyze/:owner/:name" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
