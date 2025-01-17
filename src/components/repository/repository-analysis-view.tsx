import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';
import { IssueProcessor } from './issue-processor';
import { ResultsDisplay } from '../analysis/results-display';
import { toast } from '@/hooks/use-toast';
import { useGitHub } from '@/lib/hooks/use-github';

interface RepositoryAnalysisViewProps {
  repository?: {
    owner: string;
    name: string;
    description?: string;
    stargazers_count?: number;
    forks_count?: number;
    open_issues_count?: number;
    subscribers_count?: number;
    last_analysis_timestamp?: string;
  };
  onRunAnalysis?: () => void;
}

export function RepositoryAnalysisView({ repository: propRepository, onRunAnalysis }: RepositoryAnalysisViewProps) {
  const { owner, name } = useParams();
  const navigate = useNavigate();
  const [activeJob, setActiveJob] = useState(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [repository, setRepository] = useState(propRepository);
  const { withGitHub } = useGitHub();
  const [isLoading, setIsLoading] = useState(true);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAnalysisData() {
      try {
        setIsLoading(true);

        // If we don't have a repository from props, fetch it
        if (!repository && owner && name) {
          const repoData = await withGitHub(async (client) => {
            return client.getRepository(owner, name);
          });

          if (isMounted) {
            setRepository({
              owner: repoData.owner.login,
              name: repoData.name,
              description: repoData.description,
              stargazers_count: repoData.stargazers_count,
              forks_count: repoData.forks_count,
              open_issues_count: repoData.open_issues_count,
              subscribers_count: repoData.subscribers_count
            });
          }
        }

        // Get repository ID from database
        const { data: repoData, error: repoError } = await supabase
          .from('repositories')
          .select('*')
          .eq('owner', owner || repository?.owner)
          .eq('name', name || repository?.name)
          .single();

        if (repoError) {
          if (repoError.message.includes('No rows found')) {
            // Repository not found in database, needs to be added first
            if (isMounted) {
              toast({
                title: 'Repository Not Found',
                description: 'Please add the repository to your tracked repositories first.',
                variant: 'destructive'
              });
            }
            navigate('/');
            return;
          }
          throw repoError;
        }

        if (isMounted) {
          setRepositoryId(repoData.id);
        }

        // Check repository access
        const hasAccess = await withGitHub(async (client) => {
          try {
            await client.getRepository(repoData.owner, repoData.name);
            return true;
          } catch (error) {
            return false;
          }
        });

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
          setActiveJob(jobData);
        }

        try {
          // Get duplicate count
          const { count: duplicates, error: duplicatesError } = await supabase
            .from('duplicate_issues')
            .select('*', { count: 'exact', head: true })
            .eq('repository_id', repoData.id)
            .not('confidence_score', 'is', null);

          if (duplicatesError) {
            if (duplicatesError.message.includes('does not exist')) {
              // Table doesn't exist yet, set count to 0
              if (isMounted) {
                setDuplicateCount(0);
              }
            } else {
              throw duplicatesError;
            }
          } else if (isMounted) {
            setDuplicateCount(duplicates || 0);
          }
        } catch (error) {
          console.warn('Error fetching duplicate issues:', error);
          // Set count to 0 if there's any error
          if (isMounted) {
            setDuplicateCount(0);
          }
        }
      } catch (error) {
        console.error('Error fetching analysis data:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Failed to load repository analysis data.',
            variant: 'destructive'
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAnalysisData();
    return () => {
      isMounted = false;
    };
  }, [owner, name, repository, withGitHub, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!repository || !repositoryId) {
    return null;
  }

  return (
    <div className="space-y-8">
      <IssueProcessor
        repositoryId={repositoryId}
        owner={repository.owner}
        name={repository.name}
      />
      {activeJob && (
        <ResultsDisplay
          repositoryUrl={`https://github.com/${repository.owner}/${repository.name}`}
          issues={activeJob.results || []}
        />
      )}
    </div>
  );
}
