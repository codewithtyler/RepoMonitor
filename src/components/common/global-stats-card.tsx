import { Repository } from '@/types/repository';
import { GitPullRequest, GitMerge, GitBranch, AlertCircle } from 'lucide-react';
import { RepoStatsCard } from '@/components/repository/repo-stats-card';

interface GlobalStatsCardProps {
  repositories: Repository[];
}

export function GlobalStatsCard({ repositories }: GlobalStatsCardProps) {
  console.log('[GlobalStatsCard] Rendering with repositories:', repositories.length);

  const stats = {
    trackedRepos: repositories.length,
    analyzedRepos: repositories.filter(r => r.lastAnalysisTimestamp).length,
    openIssues: repositories.reduce((sum, r) => sum + (r.openIssuesCount ?? 0), 0),
    activeAutomations: repositories.filter(r => r.isAnalyzing).length
  };

  console.log('[GlobalStatsCard] Calculated stats:', stats);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <RepoStatsCard
        id="trackedRepos"
        title="Tracked Repositories"
        value={stats.trackedRepos.toString()}
        description="Total repositories being monitored"
        icon={GitBranch}
      />
      <RepoStatsCard
        id="analyzedRepos"
        title="Analyzed Repositories"
        value={stats.analyzedRepos.toString()}
        description="Repositories with completed analysis"
        icon={GitMerge}
      />
      <RepoStatsCard
        id="openIssues"
        title="Open Issues"
        value={stats.openIssues.toString()}
        description="Across all repositories"
        icon={GitPullRequest}
      />
      <RepoStatsCard
        id="activeAutomations"
        title="Active Automations"
        value={stats.activeAutomations.toString()}
        description="Currently running analyses"
        icon={AlertCircle}
      />
    </div>
  );
}
