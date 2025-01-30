import { useEffect, useState, useRef } from 'react';
import type { Repository } from '@/lib/hooks/use-repository-data';
import type { SearchResult } from '@/lib/contexts/search-context';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import { useRepositoryDetails } from '@/lib/hooks/use-repository-data';
import { GitBranch, GitMerge, GitPullRequest, AlertCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { theme } from '@/config/theme';
import { useNavigate } from 'react-router-dom';
import { RepoStatsCard } from '@/components/common/repo-stats-card';

interface RepositoryDetailViewProps {
  repository: Repository | SearchResult;
  onBack: () => void;
}

export function RepositoryDetailView({ repository, onBack }: RepositoryDetailViewProps) {
  const { data: details, isLoading } = useRepositoryDetails(repository.owner, repository.name);
  const { analysisState, startAnalysis, clearSelection } = useAnalysis();
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<'analyze' | 'track'>('analyze');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onBack]);

  if (isLoading || !details) {
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

  const handleTrackRepository = async () => {
    if (!details) return;

    try {
      // Get existing tracked repositories from localStorage
      const trackedRepos = JSON.parse(localStorage.getItem('trackedRepositories') || '[]');

      // Check if repository is already tracked
      const isAlreadyTracked = trackedRepos.some(
        (repo: any) => repo.owner === details.owner && repo.name === details.name
      );

      if (isAlreadyTracked) {
        // Remove from tracked repositories if already tracked
        const updatedRepos = trackedRepos.filter(
          (repo: any) => !(repo.owner === details.owner && repo.name === details.name)
        );
        localStorage.setItem('trackedRepositories', JSON.stringify(updatedRepos));

        // Decrement total repositories count
        const currentTotal = parseInt(localStorage.getItem('totalRepositories') || '0');
        localStorage.setItem('totalRepositories', Math.max(0, currentTotal - 1).toString());
      } else {
        // Add to tracked repositories
        trackedRepos.push({
          owner: details.owner,
          name: details.name,
          id: details.id,
          description: details.description,
          openIssuesCount: details.openIssuesCount
        });
        localStorage.setItem('trackedRepositories', JSON.stringify(trackedRepos));

        // Increment total repositories count
        const currentTotal = parseInt(localStorage.getItem('totalRepositories') || '0');
        localStorage.setItem('totalRepositories', (currentTotal + 1).toString());
      }

      // Force a re-render of components
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Failed to track repository:', error);
    }
  };

  const handleBackToDashboard = () => {
    clearSelection();
    navigate('/');
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

  const handleActionClick = () => {
    if (selectedAction === 'analyze') {
      handleStartAnalysis();
    } else {
      handleTrackRepository();
    }
  };

  const getTrackButtonText = () => {
    // Get existing tracked repositories from localStorage
    const trackedRepos = JSON.parse(localStorage.getItem('trackedRepositories') || '[]');
    const isTracked = trackedRepos.some(
      (repo: any) => repo.owner === details.owner && repo.name === details.name
    );
    return isTracked ? 'Untrack Repository' : 'Track Repository';
  };

  return (
    <div className="space-y-8">
      {/* Back to Dashboard */}
      <button
        onClick={handleBackToDashboard}
        className="flex items-center gap-2 text-sm font-medium transition-all duration-200 ease-in-out hover:opacity-80"
        style={{ color: theme.colors.text.secondary }}
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-in-out group-hover:-translate-x-1" />
        Back to Dashboard
      </button>

      {/* Repository Name */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
          <a
            href={`https://github.com/${details.owner}/${details.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-[#2ea043] transition-colors"
          >
            {details.owner}/{details.name}
          </a>
        </h2>
        {details.description && (
          <p className="mt-2" style={{ color: theme.colors.text.secondary }}>
            {details.description}
          </p>
        )}
      </div>

      {/* Repository Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <RepoStatsCard
          id="openIssues"
          title="Open Issues"
          value={details.openIssuesCount?.toString() || '0'}
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
          <div className="relative inline-block" ref={dropdownRef}>
            <div className="flex">
              <button
                onClick={handleActionClick}
                className={`px-4 py-2 rounded-l-lg transition-colors w-[200px] ${selectedAction === 'analyze'
                  ? 'bg-[#238636] hover:bg-[#2ea043] text-white'
                  : 'bg-[#ffd33d] hover:bg-[#ffdf5d] text-black'
                  }`}
              >
                {selectedAction === 'analyze'
                  ? (analysisState?.phase === 'complete' ? 'Re-Analyze Repository' : 'Analyze Repository')
                  : getTrackButtonText()}
              </button>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`px-2 py-2 rounded-r-lg transition-colors border-l border-white/20 ${selectedAction === 'analyze'
                  ? 'bg-[#238636] hover:bg-[#2ea043] text-white'
                  : 'bg-[#ffd33d] hover:bg-[#ffdf5d] text-black'
                  }`}
                aria-label="Show more options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            {/* Dropdown Menu */}
            <div
              className={`absolute right-0 mt-2 w-[232px] rounded-lg shadow-lg bg-[#21262d] border border-[#30363d] z-10 ${isDropdownOpen ? '' : 'hidden'
                }`}
            >
              <button
                onClick={() => {
                  setSelectedAction(selectedAction === 'analyze' ? 'track' : 'analyze');
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left transition-colors rounded-lg ${selectedAction === 'analyze'
                  ? 'bg-[#ffd33d] hover:bg-[#ffdf5d] text-black'
                  : 'bg-[#238636] hover:bg-[#2ea043] text-white'
                  }`}
              >
                {selectedAction === 'analyze'
                  ? getTrackButtonText()
                  : (analysisState?.phase === 'complete' ? 'Re-Analyze Repository' : 'Analyze Repository')}
              </button>
            </div>
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
    </div>
  );
}
