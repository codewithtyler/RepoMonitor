import { Routes, Route } from 'react-router-dom';
import { Home } from '@/pages/Home';
import { Dashboard } from '@/pages/Dashboard';
import { AuthCallback } from '@/pages/auth/callback';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { WorkInProgress } from '@/pages/WorkInProgress';

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/work-in-progress" element={<WorkInProgress />} />
        </Routes>
    );
}
