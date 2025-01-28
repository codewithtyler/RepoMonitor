import { GitBranch, GitMerge, GitPullRequest, AlertCircle, ArrowLeft } from 'lucide-react';
import { theme } from '@/config/theme';
import { useRepositoryDetails } from '@/lib/hooks/use-repository-data';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { RepoStatsCard } from '@/components/common/repo-stats-card';

interface RepositoryDetailViewProps {
  owner: string;
  name: string;
}

export function RepositoryDetailView({ owner, name }: RepositoryDetailViewProps) {
  const { data: repository, isLoading } = useRepositoryDetails(owner, name);
  const { analysisState, startAnalysis, clearSelection } = useAnalysis();

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
    clearSelection();
  };

  // Helper function to get phase progress percentage
  const getPhaseProgress = (phase: string) => {
    if (!analysisState?.phase) return 0;
    const phases = ['not_started', 'cloning', 'analyzing', 'indexing', 'complete'];
    const currentIndex = phases.indexOf(analysisState.phase);
    const phaseIndex = phases.indexOf(phase);

    if (currentIndex === phaseIndex) {
      return analysisState.progress || 0;
    }
    if (currentIndex > phaseIndex) {
      return 100;
    }
    return 0;
  };

  // Helper function to create the circular progress SVG
  const CircularProgress = ({ progress }: { progress: number }) => {
    const size = 32; // w-8 h-8 = 32px
    const strokeWidth = 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <svg className="transform -rotate-90 w-8 h-8">
        <circle
          className="opacity-20"
          stroke={theme.colors.brand.primary}
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={theme.colors.brand.primary}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
    );
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
              {!analysisState?.phase || analysisState.phase === 'not_started'
                ? 'Click Start Analysis to begin analyzing this repository'
                : 'Analysis in progress - please do not close this window'}
            </p>
          </div>
          {/* Analysis Button */}
          <button
            onClick={handleStartAnalysis}
            className="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: theme.colors.brand.primary }}
          >
            {analysisState?.phase === 'complete' ? 'Re-Analyze' : 'Start Analysis'}
          </button>
        </div>

        {/* Analysis Progress */}
        {analysisState?.phase && analysisState.phase !== 'not_started' && (
          <div className="space-y-4">
            {/* Data Collection Phase */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <CircularProgress progress={getPhaseProgress('cloning')} />
                {getPhaseProgress('cloning') === 100 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    100%
                  </div>
                )}
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
              <div className="relative">
                <CircularProgress progress={getPhaseProgress('analyzing')} />
                {getPhaseProgress('analyzing') === 100 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    100%
                  </div>
                )}
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
              <div className="relative">
                <CircularProgress progress={getPhaseProgress('indexing')} />
                {getPhaseProgress('indexing') === 100 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    100%
                  </div>
                )}
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
              <div className="relative">
                <CircularProgress progress={getPhaseProgress('complete')} />
                {getPhaseProgress('complete') === 100 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    100%
                  </div>
                )}
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
