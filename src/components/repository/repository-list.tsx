import { useState, useEffect } from 'react';
import { useGitHub } from '@/lib/hooks/use-github';
import { Plus, Trash2 } from 'lucide-react';
import { theme } from '@/config/theme';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/auth/supabase-client';
import type { GitHubClient } from '@/lib/github';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useSearch } from '@/lib/contexts/search-context';

interface Repository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  private: boolean;
  description: string | null;
  updated_at: string | null;
}

export function RepositoryList() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const { loading, withGitHub } = useGitHub();
  const navigate = useNavigate();
  const { searchQuery, setTriggerSearch } = useSearch();

  const loadRepositories = async () => {
    try {
      console.log('Loading repositories...');
      const repos = await withGitHub(async (client: GitHubClient) => {
        console.log('GitHub client created, fetching repositories...');
        const response = await client.listUserRepositories({
          sort: 'updated',
          per_page: 100,
          searchQuery: searchQuery
        });
        console.log('Repositories response:', response);
        return response.map((repo: {
          id: number;
          name: string;
          owner: { login: string };
          private: boolean;
          description: string | null;
          updated_at: string | null;
        }): Repository => ({
          id: repo.id,
          name: repo.name,
          owner: {
            login: repo.owner.login
          },
          private: repo.private,
          description: repo.description,
          updated_at: repo.updated_at
        }));
      });

      console.log('Processed repositories:', repos);
      if (repos) {
        setRepositories(repos);
      }
    } catch (error) {
      console.error('Error loading repositories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load repositories. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Set up the trigger search function
  useEffect(() => {
    setTriggerSearch(() => loadRepositories);
  }, []);

  const trackRepository = async (repo: Repository) => {
    try {
      // Check if we have access and get permissions
      const access = await withGitHub((client: GitHubClient) =>
        client.checkRepositoryAccess(repo.owner.login, repo.name)
      );

      if (!access?.hasAccess) {
        toast({
          title: 'Access Error',
          description: 'You no longer have access to this repository.',
          variant: 'destructive'
        });
        return;
      }

      // Add repository to tracking
      const { error } = await supabase
        .from('repositories')
        .upsert({
          github_id: repo.id,
          name: repo.name,
          owner: repo.owner.login,
          repository_permissions: access.permissions,
          last_analysis_timestamp: null,
          analyzed_by_user_id: null,
          is_public: !access.isPrivate
        });

      if (error) throw error;

      toast({
        title: 'Repository Added',
        description: `Now tracking ${repo.owner.login}/${repo.name}`,
      });

      setSelectedRepos(prev => {
        const next = new Set(prev);
        next.add(repo.id);
        return next;
      });

      // Navigate to analysis page
      navigate(`/analyze/${repo.owner.login}/${repo.name}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to track repository. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const removeRepository = async (repo: Repository) => {
    try {
      const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('github_id', repo.id);

      if (error) throw error;

      toast({
        title: 'Repository Removed',
        description: `Stopped tracking ${repo.owner.login}/${repo.name}`,
      });

      setSelectedRepos(prev => {
        const next = new Set(prev);
        next.delete(repo.id);
        return next;
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove repository. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const filteredRepos = repositories.filter(repo =>
    searchQuery ? `${repo.owner.login}/${repo.name}`.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRepos.map(repo => (
            <div
              key={repo.id}
              className="flex items-center justify-between rounded-lg p-4"
              style={{
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.primary
              }}
            >
              <div>
                <h3 className="font-medium" style={{ color: theme.colors.text.primary }}>
                  {repo.owner.login}/{repo.name}
                </h3>
                {repo.description && (
                  <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    {repo.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {selectedRepos.has(repo.id) ? (
                  <button
                    onClick={() => removeRepository(repo)}
                    className="flex items-center rounded-lg px-3 py-1"
                    style={{ backgroundColor: '#dc2626', color: theme.colors.text.primary }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => trackRepository(repo)}
                    className="flex items-center rounded-lg px-3 py-1"
                    style={{ backgroundColor: theme.colors.brand.primary, color: theme.colors.text.primary }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Track
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}