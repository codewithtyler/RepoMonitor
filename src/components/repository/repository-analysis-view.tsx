import { useState, useEffect } from 'react';
import { Button } from '@/components/common/button';
import { PlayCircle, History, Loader2 } from 'lucide-react';
import { theme } from '@/config/theme';
import { supabase } from '@/lib/auth/supabase-client';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/lib/auth/hooks';
import { useGitHub } from '@/lib/hooks/use-github';
import { useNavigate } from 'react-router-dom';

interface RepositoryAnalysisViewProps {
  repository: {
    owner: string;
    name: string;
    last_analysis_timestamp?: string;
  };
  onRunAnalysis: () => void;
}

export function RepositoryAnalysisView({ repository, onRunAnalysis }: RepositoryAnalysisViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const { user } = useUser();
  const { withGitHub, isAuthenticated } = useGitHub();
  const navigate = useNavigate();

  // Fetch active job and duplicate count
  useEffect(() => {
    let isMounted = true;

    async function fetchAnalysisData() {
      if (!user || !isAuthenticated) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to view analysis data.',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      try {
        // Get repository ID first
        const { data: repoData, error: repoError } = await supabase
          .from('repositories')
          .select('id')
          .eq('owner', repository.owner)
          .eq('name', repository.name)
          .maybeSingle();

        if (repoError) throw repoError;

        // If repository not found, redirect to add repository flow
        if (!repoData) {
          toast({
            title: 'Repository Not Found',
            description: 'This repository needs to be tracked first.',
          });
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // Verify GitHub access
        let hasAccess = false;
        try {
          const result = await withGitHub(async (client) => {
            const access = await client.checkRepositoryAccess(repository.owner, repository.name);
            return access;
          });
          hasAccess = result?.hasAccess ?? false;
        } catch (error) {
          console.error('GitHub access error:', error);
          if (isMounted) {
            toast({
              title: 'Access Error',
              description: 'Unable to verify repository access. Please sign in again.',
              variant: 'destructive'
            });
          }
          navigate('/auth');
          return;
        }

        if (!hasAccess) {
          if (isMounted) {
            toast({
              title: 'Access Denied',
              description: 'You do not have access to this repository.',
              variant: 'destructive'
            });
          }
          navigate('/');
          return;
        }

        if (!isMounted) return;

        // Check for active job
        const { data: jobData, error: jobError } = await supabase
          .from('analysis_jobs')
          .select('*')
          .eq('repository_id', repoData.id)
          .in('status', ['fetching', 'processing', 'analyzing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobError) throw jobError;
        if (isMounted) {
          setActiveJob(jobData || null);
        }

        // Get duplicate count
        const { count: duplicates, error: duplicatesError } = await supabase
          .from('duplicate_issues')
          .select('*', { count: 'exact', head: true })
          .eq('repository_id', repoData.id)
          .not('confidence_score', 'is', null);

        if (duplicatesError) {
          if (duplicatesError.message.includes('does not exist')) {
            const { count: legacyDuplicates, error: legacyError } = await supabase
              .from('duplicate_issues')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', jobData?.id);

            if (legacyError) throw legacyError;
            if (isMounted) {
              setDuplicateCount(legacyDuplicates || 0);
            }
          } else {
            throw duplicatesError;
          }
        } else if (isMounted) {
          setDuplicateCount(duplicates || 0);
        }
      } catch (error) {
        console.error('Error fetching analysis data:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to load analysis data.',
            variant: 'destructive'
          });
        }
      }
    }

    fetchAnalysisData();
    return () => {
      isMounted = false;
    };
  }, [repository.owner, repository.name, user, isAuthenticated, withGitHub, navigate]);

  const handleRunAnalysis = async () => {
    if (!user || !isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to run analysis.',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    try {
      await onRunAnalysis();
    } catch (error) {
      console.error('Error starting analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to start analysis. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: theme.colors.background.secondary }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
          Repository Analysis
        </h3>
        {repository.last_analysis_timestamp ? (
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
            <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Last analyzed: {new Date(repository.last_analysis_timestamp).toLocaleDateString()}
            </span>
          </div>
        ) : null}
      </div>

      {activeJob ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Analysis in progress...
            </p>
          </div>
        </div>
      ) : repository.last_analysis_timestamp ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Found {duplicateCount} potential duplicate issues
            </p>
            <Button
              onClick={handleRunAnalysis}
              disabled={isLoading || !user || !isAuthenticated}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Run New Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm mb-4" style={{ color: theme.colors.text.secondary }}>
            No analysis has been run for this repository yet
          </p>
          <Button
            onClick={handleRunAnalysis}
            disabled={isLoading || !user || !isAuthenticated}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
