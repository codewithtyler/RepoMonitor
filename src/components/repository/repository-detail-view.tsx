import { GitBranch, GitMerge, GitPullRequest, AlertCircle, ArrowLeft } from 'lucide-react';
import { theme } from '@/config/theme';
import { useRepositoryDetails } from '@/lib/hooks/use-repository-data';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { RepoStatsCard } from '@/components/common/repo-stats-card';
import { useNavigate } from 'react-router-dom';

interface RepositoryDetailViewProps {
  owner: string;
  name: string;
}

export function RepositoryDetailView({ owner, name }: RepositoryDetailViewProps) {
  const { data: repository, isLoading } = useRepositoryDetails(owner, name);
  const { analysisState, startAnalysis } = useAnalysis();
  const navigate = useNavigate();

  if (isLoading || !repository) {
    return (
      <div className="text-center" style={{ color: theme.colors.text.secondary }}>
        Loading repository details...
      </div>
    );
  }

  const handleStartAnalysis = async () => {
    try {
      await startAnalysis();
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="space-y-8">
      {/* Back to Dashboard */}
      <button
        onClick={handleBackToDashboard}
        className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ color: theme.colors.text.secondary }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Repository Name */}
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

      {/* Repository Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <RepoStatsCard
          id="openIssues"
          title="Open Issues"
          value={repository.openIssuesCount?.toString() || '0'}
          description="Total open issues"
          icon={GitPullRequest}
        />
        <RepoStatsCard
          id="duplicateIssues"
          title="Duplicate Issues - Coming Soon™"
          value="0"
          description="From last analysis"
          icon={GitMerge}
        />
        <RepoStatsCard
          id="estimatedDuplicates"
          title="Est. Duplicates - Coming Soon™"
          value="0"
          description="Based on historical trends"
          icon={GitBranch}
        />
        <RepoStatsCard
          id="averageIssues"
          title="Average Age - Coming Soon™"
          value="0"
          description="Per open issue"
          icon={AlertCircle}
        />
      </div>

      {/* Issue Analysis Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
              Issue Analysis
            </h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {!analysisState?.phase ? 'Click Start Analysis to begin analyzing this repository' : 'Analysis in progress - please do not close this window'}
            </p>
          </div>
          {!analysisState?.phase && (
            <button
              onClick={handleStartAnalysis}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: theme.colors.brand.primary,
                color: theme.colors.text.inverse
              }}
            >
              Start Analysis
            </button>
          )}
        </div>

        {/* Analysis Phases */}
        {analysisState?.phase && analysisState.phase !== 'not_started' && (
          <div className="space-y-4">
            {/* Data Collection Phase */}
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysisState.phase === 'cloning' ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                <span className="text-xs text-white">
                  {analysisState.phase === 'cloning' ? '100%' : '0%'}
                </span>
              </div>
              <div>
                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>
                  Stage 1: Data Collection
                </h4>
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Fetching issues from GitHub repository
                </p>
              </div>
            </div>

            {/* Processing Phase */}
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysisState.phase === 'analyzing' ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                <span className="text-xs text-white">
                  {analysisState.phase === 'analyzing' ? '100%' : '0%'}
                </span>
              </div>
              <div>
                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>
                  Stage 2: Processing Issues
                </h4>
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Generating embeddings for similarity detection
                </p>
              </div>
            </div>

            {/* Analysis Phase */}
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysisState.phase === 'indexing' ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                <span className="text-xs text-white">
                  {analysisState.phase === 'indexing' ? '100%' : '0%'}
                </span>
              </div>
              <div>
                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>
                  Stage 3: Analyzing Issues
                </h4>
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Searching for potential duplicates
                </p>
              </div>
            </div>

            {/* Report Generation Phase */}
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysisState.phase === 'complete' ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                <span className="text-xs text-white">
                  {analysisState.phase === 'complete' ? '100%' : '0%'}
                </span>
              </div>
              <div>
                <h4 className="font-medium" style={{ color: theme.colors.text.primary }}>
                  Stage 4: Generating Report
                </h4>
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Preparing analysis results
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
