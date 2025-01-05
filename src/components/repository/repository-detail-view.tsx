import { GitBranch, GitPullRequest, Star, Users } from 'lucide-react';
import { theme } from '@/config/theme';
import { RepositoryAnalysisView } from './repository-analysis-view';

interface RepositoryDetailViewProps {
  repository: {
    owner: string;
    name: string;
    description?: string;
    stargazers_count?: number;
    forks_count?: number;
    open_issues_count?: number;
    subscribers_count?: number;
    last_analysis_timestamp?: string;
  };
}

export function RepositoryDetailView({ repository }: RepositoryDetailViewProps) {
  const stats = [
    {
      title: 'Stars',
      value: repository.stargazers_count?.toString() || '0',
      icon: Star
    },
    {
      title: 'Forks',
      value: repository.forks_count?.toString() || '0',
      icon: GitBranch
    },
    {
      title: 'Open Issues',
      value: repository.open_issues_count?.toString() || '0',
      icon: GitPullRequest
    },
    {
      title: 'Watchers',
      value: repository.subscribers_count?.toString() || '0',
      icon: Users
    }
  ];

  const handleRunAnalysis = async () => {
    // TODO: Implement analysis logic
    console.log('Running analysis for', repository.owner + '/' + repository.name);
  };

  return (
    <div className="space-y-6">
      {/* Repository Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
          {repository.owner}/{repository.name}
        </h2>
        {repository.description && (
          <p className="mt-2" style={{ color: theme.colors.text.secondary }}>
            {repository.description}
          </p>
        )}
      </div>

      {/* Repository Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="p-4 rounded-lg"
            style={{ backgroundColor: theme.colors.background.secondary }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  {stat.title}
                </p>
                <p className="text-2xl font-semibold mt-1" style={{ color: theme.colors.text.primary }}>
                  {stat.value}
                </p>
              </div>
              <stat.icon className="h-8 w-8" style={{ color: theme.colors.text.secondary }} />
            </div>
          </div>
        ))}
      </div>

      {/* Analysis Section */}
      <RepositoryAnalysisView 
        repository={repository}
        onRunAnalysis={handleRunAnalysis}
      />
    </div>
  );
} 