import { useState } from 'react';
import { useRepositoryDetails } from '@/lib/hooks/use-repository-data';
import { IssueProcessor } from './issue-processor';
import { ResultsDisplay } from '../analysis/results-display';
import { ActiveAnalysisCard } from './active-analysis-card';
import { theme } from '@/config/theme';

interface DuplicateIssue {
  id: number;
  number: number;
  title: string;
  confidence: number;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  labels: string[];
  duplicates: DuplicateIssue[];
}

interface AnalysisJob {
  id: string;
  status: string;
  results: Issue[];
}

interface RepositoryAnalysisViewProps {
  owner: string;
  name: string;
}

export function RepositoryAnalysisView({ owner, name }: RepositoryAnalysisViewProps) {
  const { data: repository, isLoading, error } = useRepositoryDetails(owner, name);
  const [activeJob, setActiveJob] = useState<AnalysisJob | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center" style={{ color: theme.colors.text.secondary }}>
          Loading repository details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center" style={{ color: theme.colors.error.primary }}>
          {error.message}
        </div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="p-4">
        <div className="text-center" style={{ color: theme.colors.error.primary }}>
          Repository not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
            {repository.owner}/{repository.name}
          </h1>
          {repository.description && (
            <p className="mt-2" style={{ color: theme.colors.text.secondary }}>
              {repository.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Stars
            </span>
            <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {repository.stargazersCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Forks
            </span>
            <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {repository.forksCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Open Issues
            </span>
            <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {repository.openIssuesCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
              Duplicate Issues
            </span>
            <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {duplicateCount}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ color: theme.colors.text.primary }}>
              Issue Analysis
            </h2>
            <IssueProcessor
              repositoryId={repository.github_id}
              owner={repository.owner}
              name={repository.name}
              onJobUpdate={setActiveJob}
              onDuplicateCountChange={setDuplicateCount}
            />
            {activeJob && activeJob.results && (
              <ResultsDisplay
                issues={activeJob.results}
                repositoryUrl={repository.url}
              />
            )}
          </div>
        </div>
        <div>
          {activeJob && (
            <ActiveAnalysisCard job={activeJob} />
          )}
        </div>
      </div>
    </div>
  );
}
