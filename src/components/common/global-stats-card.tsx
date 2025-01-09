import { Repository } from '../../types/repository';

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Tracked Repositories</h3>
        <p className="text-3xl font-bold text-blue-600 mt-2">{stats.trackedRepos}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Analyzed Repositories</h3>
        <p className="text-3xl font-bold text-green-600 mt-2">{stats.analyzedRepos}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Open Issues</h3>
        <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.openIssues}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Active Automations</h3>
        <p className="text-3xl font-bold text-purple-600 mt-2">{stats.activeAutomations}</p>
      </div>
    </div>
  );
}
