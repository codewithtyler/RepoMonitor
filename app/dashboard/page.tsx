import { UserGreeting } from '@/components/dashboard/user-greeting';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <UserGreeting />
      </div>
      <p className="text-muted-foreground">
        Welcome to your GitHub Issue Manager dashboard. Select a repository to get started.
      </p>
    </div>
  );
}