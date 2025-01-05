import { GitPullRequest, Search, Settings, Star } from 'lucide-react';
import { theme } from '../config/theme';
import { RepositoryList } from '@/components/repository/repository-list';

const stats = [
  {
    title: "Open Issues",
    value: "0",
    description: "Across all repositories",
    icon: GitPullRequest
  },
  {
    title: "Tracked Repos",
    value: "0",
    description: "Being monitored",
    icon: Star
  },
  {
    title: "Analyzed Repos",
    value: "0",
    description: "In the last 30 days",
    icon: Search
  },
  {
    title: "Active Automations",
    value: "0",
    description: "Currently running",
    icon: Settings
  }
];

export function Dashboard() {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
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
                <p className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                  {stat.description}
                </p>
              </div>
              <stat.icon className="h-8 w-8" style={{ color: theme.colors.text.secondary }} />
            </div>
          </div>
        ))}
      </div>

      {/* Repository List */}
      <div className="mt-6">
        <RepositoryList />
      </div>
    </>
  );
}