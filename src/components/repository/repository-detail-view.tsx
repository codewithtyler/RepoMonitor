import { GitBranch, GitMerge, GitPullRequest, AlertCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { theme } from '@/config/theme';
import { useRepositoryDetails } from '@/lib/hooks/use-repository-data';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { RepoStatsCard } from '@/components/common/repo-stats-card';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useTrackedRepositories } from '@/lib/hooks/use-tracked-repositories';
import { toast } from '@/components/ui/use-toast';

interface RepositoryDetailViewProps {
  owner: string;
  name: string;
}

export function RepositoryDetailView({ owner, name }: RepositoryDetailViewProps) {
  const { data: repository, isLoading } = useRepositoryDetails(owner, name);
  const { analysisState, startAnalysis, clearSelection } = useAnalysis();
  const { data: trackedData } = useTrackedRepositories();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedAction, setSelectedAction] = useState<'analyze' | 'track'>('analyze');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    navigate('/');
  };

  const handleTrackRepository = async () => {
    if (!repository) return;

    try {
      // Add to local storage
      const trackedRepos = JSON.parse(localStorage.getItem('trackedRepositories') || '[]');
      const newRepo = {
        id: `${owner}/${name}`,
        owner,
        name,
        description: repository.description,
        openIssuesCount: repository.openIssuesCount
      };

      // Check if already tracked
      if (!trackedRepos.some((repo: any) => repo.id === newRepo.id)) {
        trackedRepos.push(newRepo);
        localStorage.setItem('trackedRepositories', JSON.stringify(trackedRepos));
      }

      // Show success message
      toast({
        title: 'Repository Tracked',
        description: `Successfully tracked ${owner}/${name}`,
      });
    } catch (error) {
      console.error('Failed to track repository:', error);
      toast({
        title: 'Error',
        description: 'Failed to track repository. Please try again.',
        variant: 'destructive'
      });
    }
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

  const handleActionSelect = async (action: 'analyze' | 'track') => {
    setSelectedAction(action);
    setIsDropdownOpen(false);

    if (action === 'analyze') {
      await handleStartAnalysis();
    } else if (action === 'track') {
      await handleTrackRepository();
    }
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
          {/* Analysis Button with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex w-[180px]">
              <button
                onClick={() => handleActionSelect(selectedAction)}
                className="flex-1 px-4 py-2 rounded-l-lg text-white transition-colors hover:opacity-80 whitespace-nowrap"
                style={{ backgroundColor: selectedAction === 'analyze' ? '#238636' : '#d29922' }}
              >
                {selectedAction === 'analyze' ? 'Analyze Repository' : 'Track Repository'}
              </button>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-1 py-2 rounded-r-lg text-white transition-colors border-l border-white/20 hover:opacity-80"
                style={{ backgroundColor: selectedAction === 'analyze' ? '#238636' : '#d29922' }}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-[180px] rounded-lg shadow-lg overflow-hidden border"
                style={{ backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }}
              >
                <button
                  onClick={() => handleActionSelect(selectedAction === 'analyze' ? 'track' : 'analyze')}
                  className="w-full px-4 py-2 text-sm text-white transition-colors hover:opacity-80"
                  style={{ backgroundColor: selectedAction === 'analyze' ? '#d29922' : '#238636' }}
                >
                  {selectedAction === 'analyze' ? 'Track Repository' : 'Start Analysis'}
                </button>
              </div>
            )}
          </div>
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

      {/* Tracked Repositories Section */}
      <div>
        <h2 className="text-sm font-medium mb-3 text-[#8b949e]">
          Tracked Repositories
        </h2>
        <div className="space-y-1">
          {trackedData?.repositories && trackedData.repositories.length > 0 ? (
            trackedData.repositories.map(repo => (
              <button
                key={repo.id}
                onClick={() => handleRepositorySelect(repo)}
                className="w-full px-2 py-1 text-left rounded hover:bg-[#21262d] transition-colors text-[#8b949e]"
              >
                <span className="text-sm truncate block">
                  {repo.owner}/{repo.name}
                </span>
              </button>
            ))
          ) : (
            <div className="px-2 py-1 text-sm text-[#8b949e]">
              No tracked repositories yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
