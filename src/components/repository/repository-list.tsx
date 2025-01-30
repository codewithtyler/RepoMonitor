import type { Repository } from '@/lib/hooks/use-repository-data';
import type { SearchResult } from '@/lib/contexts/search-context';
import { Star, GitFork, AlertCircle, Lock } from 'lucide-react';

interface RepositoryListProps {
  repositories: Repository[];
  onSelect: (repository: Repository | SearchResult) => void;
}

export function RepositoryList({ repositories, onSelect }: RepositoryListProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {repositories.map((repo) => (
        <button
          key={repo.id}
          onClick={() => onSelect(repo)}
          className="w-full p-4 rounded-lg bg-[#21262d] border border-[#30363d] text-left hover:border-[#8b949e] transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-[#c9d1d9] truncate">
                  {repo.owner}/{repo.name}
                </h3>
                {repo.visibility === 'private' && (
                  <span className="px-2 py-0.5 text-xs rounded-lg bg-[#30363d] text-[#8b949e]">
                    Private
                  </span>
                )}
              </div>
              {repo.description && (
                <p className="mt-2 text-sm text-[#8b949e] line-clamp-2">{repo.description}</p>
              )}
            </div>
            <div className="flex items-center gap-6 text-[#8b949e] flex-shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-xs">{repo.stargazersCount}</span>
                <Star className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">{repo.forksCount}</span>
                <GitFork className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">{repo.openIssuesCount}</span>
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
