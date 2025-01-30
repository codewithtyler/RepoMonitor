import { Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { WorkInProgress } from '@/pages/WorkInProgress';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { SearchProvider } from '@/lib/contexts/search-context';
import { AnalysisProvider } from '@/lib/contexts/analysis-context';
import { Toaster } from 'sonner';

export function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <AnalysisProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/work-in-progress" element={<WorkInProgress />} />
          </Routes>
          <Toaster />
        </AnalysisProvider>
      </SearchProvider>
    </AuthProvider>
  );
}
