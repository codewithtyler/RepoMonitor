import { useRepositorySelection } from '@/lib/hooks/use-repository-selection';
import type { Repository } from '@/lib/hooks/use-repository-data';
import type { SearchResult } from '@/lib/contexts/search-context';
import { theme } from '@/config/theme';
import { useState, useEffect } from 'react';
import { useGitHub } from '@/lib/hooks/use-github';
import { Plus, Trash2, Star, GitBranch, GitFork, GitPullRequest } from 'lucide-react';
import { supabase } from '@/lib/auth/supabase-client';
import type { GitHubClient } from '@/lib/github';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useSearch } from '@/lib/contexts/search-context';
import { useUser } from '@/lib/auth/hooks';
import { createNotification } from '@/lib/hooks/use-notifications';

interface Props {
  repositories: (Repository | SearchResult)[];
  title?: string;
}

export function RepositoryList({ repositories, title }: Props) {
  const { handleRepositorySelect } = useRepositorySelection();
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const user = useUser();

  // Sort repositories to prioritize forks
  const sortedRepositories = [...repositories].sort((a, b) => {
    if (a.isFork && !b.isFork) return -1;
    if (!a.isFork && b.isFork) return 1;
    return 0;
  });

  const trackRepository = async (repo: Repository) => {
    if (!user) return;

    try {
      // Check if we have access and get permissions
      const access = await useGitHub(async (client: GitHubClient) => {
        const repoData = await client.getRepository(repo.owner, repo.name);
        return {
          hasAccess: true,
          isPrivate: repoData.visibility === 'private',
          permissions: repoData.permissions,
          repoData
        };
      });

      if (!access?.hasAccess) {
        await createNotification({
          userId: user.id,
          title: 'Repository Access Error',
          message: 'You no longer have access to this repository.',
          type: 'SYSTEM_ERROR',
          metadata: {
            repository: `${repo.owner}/${repo.name}`
          }
        });
        return;
      }

      // Add repository to tracking
      const { error } = await supabase
        .from('repositories')
        .upsert({
          id: repo.id,
          github_id: repo.id,
          name: repo.name,
          owner: repo.owner,
          repository_permissions: {
            admin: access.permissions?.admin || false,
            push: access.permissions?.push || false,
            pull: access.permissions?.pull || false,
            private: access.isPrivate,
            public: !access.isPrivate
          },
          last_analysis_timestamp: null,
          analyzed_by_user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error tracking repository:', error);
        throw error;
      }

      await createNotification({
        userId: user.id,
        title: 'Repository Tracked',
        message: `Now tracking ${repo.owner}/${repo.name}`,
        type: 'DATA_COLLECTION_COMPLETE',
        metadata: {
          repository: `${repo.owner}/${repo.name}`
        }
      });

      setSelectedRepos(prev => {
        const next = new Set(prev);
        next.add(repo.id);
        return next;
      });

      // Navigate to analysis page
      navigate(`/analyze/${repo.owner}/${repo.name}`);
    } catch (error) {
      console.error('Error in trackRepository:', error);
      await createNotification({
        userId: user.id,
        title: 'Repository Tracking Error',
        message: 'Failed to track repository. Please try again.',
        type: 'SYSTEM_ERROR',
        metadata: {
          repository: `${repo.owner}/${repo.name}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  if (repositories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
          No repositories found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
          {title}
        </h2>
      )}
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-4">
        {sortedRepositories.map(repository => (
          <button
            key={repository.id}
            onClick={() => handleRepositorySelect(repository)}
            className="w-full flex flex-col p-4 rounded-lg border text-left transition-colors hover:bg-gray-500/5"
            style={{ borderColor: theme.colors.border.primary, backgroundColor: theme.colors.background.secondary }}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: theme.colors.text.primary }}>
                    {repository.owner}/{repository.name}
                  </span>
                  {repository.isFork && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      backgroundColor: theme.colors.background.tertiary,
                      color: theme.colors.text.secondary
                    }}>
                      Forked
                    </span>
                  )}
                </div>
                {repository.description && (
                  <p className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                    {repository.description}
                  </p>
                )}
                {repository.isFork && repository.source && (
                  <p className="text-xs mt-1" style={{ color: theme.colors.text.secondary }}>
                    Forked from {repository.source.owner}/{repository.source.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <Star className="h-4 w-4" />
                  <span className="text-xs">{repository.stargazersCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <GitFork className="h-4 w-4" />
                  <span className="text-xs">{repository.forksCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: theme.colors.text.secondary }}>
                  <GitPullRequest className="h-4 w-4" />
                  <span className="text-xs">{repository.openIssuesCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
