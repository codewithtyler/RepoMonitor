import { RepositoryAnalysisView } from '@/components/repository/repository-analysis-view';

interface RepositoryDetailViewProps {
  owner: string;
  name: string;
}

export function RepositoryDetailView({ owner, name }: RepositoryDetailViewProps) {
  return (
    <div className="p-4">
      <RepositoryAnalysisView owner={owner} name={name} />
    </div>
  );
}
