import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';
import { useUser } from '@/lib/auth/hooks';
import { theme } from '@/config/theme';
import { GitFork, ArrowRight } from 'lucide-react';
import { Spinner } from '../components/common/spinner';

interface TrackedRepository {
  id: string;
  github_id: number;
  name: string;
  owner: string;
  last_analysis_timestamp: string | null;
}

export function TrackedPage() {
  const [repositories, setRepositories] = useState<TrackedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadTrackedRepositories() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('repositories')
          .select('*')
          .order('last_analysis_timestamp', { ascending: false, nullsFirst: false });

        if (error) throw error;
        setRepositories(data || []);
      } catch (error) {
        console.error('Error loading tracked repositories:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTrackedRepositories();
  }, [user]);

  const goToAnalysis = (owner: string, name: string) => {
    navigate(`/analyze/${owner}/${name}`);
  };

  if (loading) {
    return <Spinner size="lg" />;
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <GitFork className="h-8 w-8" style={{ color: theme.colors.text.secondary }} />
        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
          Tracked Repositories
        </h1>
      </div>

      <div className="grid gap-4">
        {repositories.map(repo => (
          <div
            key={repo.id}
            className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-gray-500/5"
            style={{ backgroundColor: theme.colors.background.secondary }}
            onClick={() => goToAnalysis(repo.owner, repo.name)}
          >
            <div>
              <h2 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
                {repo.owner}/{repo.name}
              </h2>
              {repo.last_analysis_timestamp && (
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Last analyzed: {new Date(repo.last_analysis_timestamp).toLocaleDateString()}
                </p>
              )}
            </div>
            <ArrowRight className="h-5 w-5" style={{ color: theme.colors.text.secondary }} />
          </div>
        ))}

        {repositories.length === 0 && (
          <div
            className="text-center p-8 rounded-lg"
            style={{ backgroundColor: theme.colors.background.secondary, color: theme.colors.text.secondary }}
          >
            No repositories are being tracked yet.
          </div>
        )}
      </div>
    </>
  );
}
