import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardContainer } from '../components/layout/dashboard-container';
import { Dashboard } from '../pages/Dashboard';
import { AuthCallback } from '../pages/auth/callback';
import { Home } from '../pages/Home';
import { getAuthState, subscribeToAuth } from '../lib/auth/global-state';
import { useEffect, useState } from 'react';

function ProtectedRoute() {
  console.log('[ProtectedRoute] Component mounting');
  const [state, setState] = useState(getAuthState());

  useEffect(() => {
    console.log('[ProtectedRoute] Setting up auth subscription');
    return subscribeToAuth(setState);
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

  console.log('[ProtectedRoute] User authenticated, rendering dashboard');
  return (
    <DashboardContainer>
      <Dashboard />
    </DashboardContainer>
  );
}

export function AppRouter() {
  console.log('[AppRouter] Rendering router');
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<ProtectedRoute />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/repository/:owner/:name" element={<ProtectedRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
