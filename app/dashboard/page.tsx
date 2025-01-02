import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitPullRequest, Search, Settings, Star } from 'lucide-react';

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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription className="text-2xl font-bold">
                {stat.value}
              </CardDescription>
              <div className="text-xs text-muted-foreground">
                {stat.description}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">
                Welcome to your RepoMonitor dashboard. To get started:
              </div>
              <ul className="list-disc pl-4 mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Connect your GitHub repositories</li>
                <li>Set up issue monitoring rules</li>
                <li>Configure automated responses</li>
                <li>Create custom search filters</li>
              </ul>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
