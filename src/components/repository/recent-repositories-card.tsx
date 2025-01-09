import { GitFork, GitPullRequest, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Repository } from '@/types/repository';
import { theme } from '@/config/theme';

interface RecentRepositoriesCardProps {
  repositories: Repository[];
}

export function RecentRepositoriesCard({ repositories }: RecentRepositoriesCardProps) {
  console.log('[RecentRepositoriesCard/Component] Mounting with repositories:', repositories.length);

  const navigate = useNavigate();
  const sortedRepos = [...repositories].sort((a, b) => {
    const dateA = a.lastAnalysisTimestamp ? new Date(a.lastAnalysisTimestamp) : new Date(0);
    const dateB = b.lastAnalysisTimestamp ? new Date(b.lastAnalysisTimestamp) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  }).slice(0, 5);

  console.log('[RecentRepositoriesCard/Component] Sorted and filtered to:', sortedRepos.length, 'repositories');

  const handleRepoClick = (owner: string, name: string) => {
    navigate(`/repository/${owner}/${name}`);
  };

  return (
    <div className="space-y-2">
      {sortedRepos.map((repo) => {
        console.log(`[RecentRepositoriesCard/Component] Rendering repository:`, repo.owner + '/' + repo.name);
        return (
          <div
            key={repo.id}
            onClick={() => handleRepoClick(repo.owner, repo.name)}
            className="p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-800"
            style={{ backgroundColor: theme.colors.background.secondary }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium" style={{ color: theme.colors.brand.secondary }}>
                  {repo.owner}/{repo.name}
                </h3>
                {repo.description && (
                  <p className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                    {repo.description}
                  </p>
                )}
                <p className="text-xs mt-2" style={{ color: theme.colors.text.secondary }}>
                  Last analyzed: {repo.lastAnalysisTimestamp ? new Date(repo.lastAnalysisTimestamp).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <Star className="w-4 h-4" />
                  <span className="text-xs">{repo.stargazersCount}</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <GitFork className="w-4 h-4" />
                  <span className="text-xs">{repo.forksCount}</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <GitPullRequest className="w-4 h-4" />
                  <span className="text-xs">{repo.openIssuesCount}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {sortedRepos.length === 0 && (
        <div
          className="text-center p-8 rounded-lg"
          style={{ backgroundColor: theme.colors.background.secondary, color: theme.colors.text.secondary }}
        >
          No repositories found.
        </div>
      )}
    </div>
  );
}
