import { useParams } from 'react-router-dom';
import { RepositoryAnalysisView } from '@/components/repository/repository-analysis-view';
import { useUser } from '@/lib/auth/hooks';

export function AnalyzePage() {
  const { owner, name } = useParams();
  const { user } = useUser();

  if (!owner || !name || !user) {
    return <div>Invalid repository or not logged in</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{owner}/{name}</h1>
      <RepositoryAnalysisView />
    </div>
  );
}
