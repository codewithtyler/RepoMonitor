import { GitPullRequest, Search, Settings, Star } from 'lucide-react';
import { theme } from '@/config/theme';

const stats = [
  {
    title: "Open Issues",
    value: "0",
    description: "Across all repositories",
    icon: GitPullRequest
  },
  {
    title: "Watched Repos",
    value: "0",
    description: "Being monitored",
    icon: Star
  },
  {
    title: "Recent Searches",
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

export function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div 
            key={stat.title}
            className="p-6 rounded-lg border"
            style={{ 
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.primary
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
                {stat.title}
              </h3>
              <stat.icon className="h-5 w-5" style={{ color: theme.colors.text.secondary }} />
            </div>
            <p className="mt-2 text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs" style={{ color: theme.colors.text.secondary }}>
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="rounded-lg border" style={{ 
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary
        }}>
          <div className="p-6">
            <h2 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
              Getting Started
            </h2>
            <p className="mt-2 text-sm" style={{ color: theme.colors.text.secondary }}>
              Welcome to your RepoMonitor dashboard. To get started:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-sm" style={{ color: theme.colors.text.secondary }}>
              <li>Connect your GitHub repositories</li>
              <li>Set up issue monitoring rules</li>
              <li>Configure automated responses</li>
              <li>Create custom search filters</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}