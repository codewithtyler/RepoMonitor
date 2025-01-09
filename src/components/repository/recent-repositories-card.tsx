import { GitFork, GitPullRequest, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.

interface Repository {
  id: string;
  owner: string;
  name: string;
  description?: string;
  stargazersCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
  lastAnalysisTimestamp?: string;
  isAnalyzing?: boolean;
}

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
                className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleRepoClick(repo.owner, repo.name);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {repo.owner}/{repo.name}
                  </p>
                  {repo.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    {repo.stargazersCount !== undefined && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Star className="w-4 h-4 mr-1" />
                        {repo.stargazersCount.toLocaleString()}
                      </div>
                    )}
                    {repo.forksCount !== undefined && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <GitFork className="w-4 h-4 mr-1" />
                        {repo.forksCount.toLocaleString()}
                      </div>
                    )}
                    {repo.openIssuesCount !== undefined && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <GitPullRequest className="w-4 h-4 mr-1" />
                        {repo.openIssuesCount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                {repo.isAnalyzing && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                    Analyzing
                  </span>
                )}
              </div>
            );
          })}
          {sortedRepos.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No repositories tracked yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
