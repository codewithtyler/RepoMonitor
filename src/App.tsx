import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { WorkInProgress } from '@/pages/WorkInProgress';
import { Toaster } from 'sonner';
import { MotionConfig } from 'framer-motion';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/work-in-progress" element={<WorkInProgress />} />
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
