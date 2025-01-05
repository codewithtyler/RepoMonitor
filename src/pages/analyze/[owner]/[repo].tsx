import { useParams } from 'react-router-dom';
import { IssueProcessor } from '@/components/repository/issue-processor';
import { useUser } from '@/lib/auth/hooks';

export function AnalyzePage() {
  const { owner, repo } = useParams();
  const { user } = useUser();

  if (!owner || !repo || !user) {
    return <div>Invalid repository or not logged in</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{owner}/{repo}</h1>
      <IssueProcessor
        repositoryId={`${owner}/${repo}`}
        owner={owner}
        name={repo}
      />
    </div>
  );
} 