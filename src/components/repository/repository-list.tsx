import { useRepositorySelection } from '@/lib/hooks/use-repository-selection';
import type { Repository } from '@/lib/hooks/use-repository-data';
import { theme } from '@/config/theme';
import { useState, useEffect } from 'react';
import { useGitHub } from '@/lib/hooks/use-github';
import { Plus, Trash2, Star, GitBranch } from 'lucide-react';
import { supabase } from '@/lib/auth/supabase-client';
import type { GitHubClient } from '@/lib/github';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useSearch } from '@/lib/contexts/search-context';
import { useUser } from '@/lib/auth/hooks';
import { createNotification } from '@/lib/hooks/use-notifications';

interface Props {
  repositories: Repository[];
  title?: string;
}

export function RepositoryList({ repositories, title }: Props) {
  const { handleRepositorySelect } = useRepositorySelection();
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const user = useUser();

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
      <div className="grid grid-cols-1 gap-4">
        {repositories.map(repository => (
          <button
            key={repository.id}
            onClick={() => handleRepositorySelect(repository)}
            className="flex flex-col gap-2 p-4 rounded-lg border text-left transition-colors hover:bg-gray-500/5"
            style={{ borderColor: theme.colors.border.primary }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: theme.colors.text.primary }}>
                {repository.owner}/{repository.name}
              </span>
              {repository.visibility === 'private' && (
                <span
                  className="px-2 py-1 text-xs rounded-full"
                  style={{
                    backgroundColor: theme.colors.background.primary,
                    color: theme.colors.text.secondary
                  }}
                >
                  Private
                </span>
              )}
            </div>
            {repository.description && (
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                {repository.description}
              </p>
            )}
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                ★ {repository.stargazersCount.toLocaleString()}
              </span>
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                🔀 {repository.forksCount.toLocaleString()}
              </span>
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                ⚠️ {repository.openIssuesCount.toLocaleString()}
              </span>
            </div>
            {repository.lastAnalysisTimestamp && (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: theme.colors.success.primary }}
                />
                <span className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  Last analyzed: {new Date(repository.lastAnalysisTimestamp).toLocaleString()}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
