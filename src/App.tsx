import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { WorkInProgress } from '@/pages/WorkInProgress';
import { AuthCallback } from '@/pages/auth/callback';
import { Home } from '@/pages/Home';
import { Toaster } from 'sonner';
import { MotionConfig } from 'framer-motion';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/work-in-progress" element={<WorkInProgress />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
      <Toaster
        position="bottom-right"
        theme="dark"
        closeButton
        richColors
      />
    </MotionConfig>
  );
}
