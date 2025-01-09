import { GitFork, GitPullRequest, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Repository } from '../../types/repository';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Repositories
        </h2>
        <div className="space-y-4">
          {sortedRepos.map((repo) => {
            console.log(`[RecentRepositoriesCard/Component] Rendering repository:`, repo.owner + '/' + repo.name);
            return (
              <div
                key={repo.id}
                onClick={() => handleRepoClick(repo.owner, repo.name)}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {repo.owner}/{repo.name}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Star className="w-4 h-4 mr-1" />
                      <span className="text-xs">{repo.stargazersCount}</span>
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <GitFork className="w-4 h-4 mr-1" />
                      <span className="text-xs">{repo.forksCount}</span>
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <GitPullRequest className="w-4 h-4 mr-1" />
                      <span className="text-xs">{repo.openIssuesCount}</span>
                    </div>
                  </div>
                </div>
                {repo.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {repo.description}
                  </p>
                )}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Last analyzed: {repo.lastAnalysisTimestamp ? new Date(repo.lastAnalysisTimestamp).toLocaleDateString() : 'Never'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
