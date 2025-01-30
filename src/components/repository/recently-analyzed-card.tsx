import { GitFork, Star, GitPullRequest } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Repository } from '@/types/repository';
import { theme } from '@/config/theme';

interface RecentlyAnalyzedCardProps {
  repositories: Repository[];
}

export function RecentlyAnalyzedCard({ repositories }: RecentlyAnalyzedCardProps) {
  const navigate = useNavigate();
  const sortedRepos = [...repositories]
    .sort((a, b) => {
      const dateA = a.lastAnalysisTimestamp ? new Date(a.lastAnalysisTimestamp) : new Date(0);
      const dateB = b.lastAnalysisTimestamp ? new Date(b.lastAnalysisTimestamp) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  return (
    <div className="space-y-2">
      {sortedRepos.map((repo) => (
        <div
          key={repo.id}
          onClick={() => navigate(`/repository/${repo.owner}/${repo.name}`)}
          className="p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-500/5"
          style={{ backgroundColor: theme.colors.background.secondary }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <GitFork className="h-4 w-4 mr-2 shrink-0" style={{ color: theme.colors.text.secondary }} />
              <div className="truncate">
                <span style={{ color: theme.colors.text.primary }}>{repo.owner}/</span>
                <span className="font-medium" style={{ color: theme.colors.text.primary }}>{repo.name}</span>
                {repo.description && (
                  <p className="text-xs truncate mt-1" style={{ color: theme.colors.text.secondary }}>
                    {repo.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {repo.stargazersCount > 0 && (
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <Star className="h-4 w-4" />
                  <span className="text-xs">{repo.stargazersCount}</span>
                </div>
              )}
              {repo.openIssuesCount > 0 && (
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <GitPullRequest className="h-4 w-4" />
                  <span className="text-xs">{repo.openIssuesCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {sortedRepos.length === 0 && (
        <div
          className="text-center p-8 rounded-lg"
          style={{ backgroundColor: theme.colors.background.secondary, color: theme.colors.text.secondary }}
        >
          No repositories analyzed yet
        </div>
      )}
    </div>
  );
}
