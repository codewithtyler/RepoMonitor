import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGitHub } from '@/lib/hooks/use-github';
import { AnalysisSharingService } from '@/lib/services/analysis-sharing';
import { useUser } from '@/lib/auth/hooks';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/common/button';
import { Spinner } from '@/components/common/spinner';
import { formatDistanceToNow } from 'date-fns';

interface Repository {
  id: number;
  full_name: string;
  last_analysis_timestamp: string | null;
  analyzed_by_user: {
    name: string;
  } | null;
  is_syncing?: boolean;
}

export function RepositoryDashboard() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const { withGitHub } = useGitHub();
  const { user } = useUser();
  const navigate = useNavigate();

  // Load repositories on mount
  useEffect(() => {
    async function loadRepositories() {
      setLoading(true);
      const result = await withGitHub(async (client) => {
        const response = await client.listUserRepositories();
        return response.data.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          owner: repo.owner,
          description: repo.description,
          private: repo.private,
          stargazers_count: repo.stargazers_count
        }));
      });

      if (result) {
        // Load analysis metadata for each repository
        const sharingService = new AnalysisSharingService(user!.id);
        const reposWithAnalysis = await Promise.all(
          result.map(async (repo: Repository) => {
            const access = await sharingService.checkRepositoryAccess(
              repo.full_name.split('/')[0],
              repo.full_name.split('/')[1]
            );
            if (!access.hasAccess) return repo;

            const analysis = await sharingService.getExistingAnalysis(access.repositoryId);
            if (!analysis) return repo;

            return {
              ...repo,
              last_analysis_timestamp: analysis.lastAnalysisTimestamp.toISOString(),
              analyzed_by_user: {
                name: analysis.analyzedByUser.name
              }
            };
          })
        );

        setRepositories(reposWithAnalysis);
      }
      setLoading(false);
    }

    loadRepositories();
  }, [withGitHub, user]);

  async function handleAnalyze(repo: Repository) {
    // Mark repository as syncing
    setRepositories(repos =>
      repos.map(r => r.id === repo.id ? { ...r, is_syncing: true } : r)
    );

    try {
      // Navigate to analysis page
      navigate(`/analyze/${repo.full_name}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start analysis. Please try again.',
        variant: 'destructive'
      });
      // Remove syncing state
      setRepositories(repos =>
        repos.map(r => r.id === repo.id ? { ...r, is_syncing: false } : r)
      );
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Repositories</h1>

      <div className="grid gap-4">
        {repositories.map(repo => (
          <div
            key={repo.id}
            className="border rounded-lg p-4 flex items-center justify-between bg-white shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold">{repo.full_name}</h2>
              {repo.last_analysis_timestamp && (
                <p className="text-sm text-gray-500">
                  Last analyzed {formatDistanceToNow(new Date(repo.last_analysis_timestamp))} ago
                  {repo.analyzed_by_user && ` by ${repo.analyzed_by_user.name}`}
                </p>
              )}
            </div>

            <Button
              onClick={() => handleAnalyze(repo)}
              disabled={repo.is_syncing}
            >
              {repo.is_syncing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}