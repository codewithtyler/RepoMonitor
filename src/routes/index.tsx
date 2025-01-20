import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { AuthCallback } from '../pages/auth/callback';
import { Home } from '../pages/Home';
import { Repository } from '../pages/Repository';
import { AnalyzePage } from '../pages/analyze/[owner]/[repo]';
import { getAuthState, subscribeToAuth, type AuthState } from '../lib/auth/global-state';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  console.log('[ProtectedRoute] Component mounting');
  const [state, setState] = useState<AuthState>({ loading: true, user: null, session: null });

  useEffect(() => {
    console.log('[ProtectedRoute] Setting up auth subscription');
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      const initialState = await getAuthState();
      setState(initialState);
      unsubscribe = subscribeToAuth((newState) => {
        setState(newState);
      });
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  console.log('[ProtectedRoute] State:', { loading: state.loading, hasUser: !!state.user, userId: state.user?.id });

  if (state.loading) {
    console.log('[ProtectedRoute] Showing loading state');
    return <div>Loading...</div>;
  }

  if (!state.user) {
    console.log('[ProtectedRoute] No user, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('[ProtectedRoute] User authenticated, rendering children');
  return <>{children}</>;
}

export function AppRouter() {
  console.log('[AppRouter] Rendering router');
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/repository/:owner/:name" element={<ProtectedRoute><Repository /></ProtectedRoute>} />
      <Route path="/analyze/:owner/:name" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
    </Routes>
  );
}
