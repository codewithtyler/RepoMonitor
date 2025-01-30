import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { AuthCallback } from '../pages/auth/callback';
import { Home } from '../pages/Home';
import { Repository } from '../pages/Repository';
import { AnalyzePage } from '../pages/analyze/[owner]/[repo]';
import { getAuthState, subscribeToAuth, type AuthState } from '../lib/auth/global-state';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, session: null });

  useEffect(() => {
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

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!state.user) {
    // Use state to preserve the current URL
    return <Navigate to="/login" state={{ from: window.location.pathname }} />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Home />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/repository/:owner/:name" element={<ProtectedRoute><Repository /></ProtectedRoute>} />
      <Route path="/analyze/:owner/:name" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
    </Routes>
  );
}
