import { useParams } from 'react-router-dom';
import { RepositoryAnalysisView } from '@/components/repository/repository-analysis-view';

export function AnalyzePage() {
  const { owner, name } = useParams<{ owner: string; name: string }>();

  if (!owner || !name) {
    return (
      <div className="p-4 text-red-500">
        Invalid repository URL. Please check the URL and try again.
      </div>
    );
  }

  return (
    <div className="p-4">
      <RepositoryAnalysisView owner={owner} name={name} />
    </div>
  );
}
