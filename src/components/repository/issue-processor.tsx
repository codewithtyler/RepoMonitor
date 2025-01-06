import { useState, useEffect } from 'react';
import { useGitHub } from '@/lib/hooks/use-github';
import { supabase } from '@/lib/auth/supabase-client';
import { theme } from '@/config/theme';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, GitPullRequest, GitMerge, GitBranch } from 'lucide-react';
import { RepoStatsCard } from '@/components/common/repo-stats-card';
import type { GitHubClient } from '@/lib/github';
import { motion } from 'framer-motion';

interface IssueProcessorProps {
  repositoryId: string;
  owner: string;
  name: string;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  state: string;
}

interface Label {
  name: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  pull_request?: any;
}

export function IssueProcessor({ repositoryId, owner, name }: IssueProcessorProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const { withGitHub } = useGitHub();

  // Handle initial mount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch open issues count
  useEffect(() => {
    const fetchOpenIssues = async () => {
      try {
        const issues = await withGitHub(async (client: GitHubClient) => {
          const response = await client.listRepositoryIssues(owner, name, {
            state: 'open',
            per_page: 100
          });
          return response.filter((issue: GitHubIssue) => !issue.pull_request);
        });
        setOpenIssuesCount(issues?.length || 0);
      } catch (error) {
        console.error('Error fetching open issues count:', error);
        setOpenIssuesCount(0);
      }
    };

    fetchOpenIssues();
  }, [owner, name, withGitHub]);

  // Fetch duplicate issues count from last analysis
  useEffect(() => {
    const fetchDuplicates = async () => {
      const { data } = await supabase
        .from('duplicate_issues')
        .select('duplicate_issue_id', { count: 'exact' })
        .eq('repository_id', repositoryId);
      setDuplicateCount(data?.length || 0);
    };
    fetchDuplicates();
  }, [repositoryId]);

  const processIssues = async () => {
    try {
      console.log('[Step 1] Starting analysis for:', { owner, name });
      setLoading(true);
      setIsComplete(false);
      setStatus('Fetching issues...');
      setProgress(0);

      // Get all issues
      console.log('[Step 2] Initializing GitHub client for issue fetching');
      const issues = await withGitHub(async (client: GitHubClient) => {
        console.log('[Step 2.1] GitHub client initialized');
        const allIssues: Issue[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          console.log('[Step 2.2] Fetching page', page);
          try {
            const response = await client.searchRepositoryIssues(owner, name, {
              state: 'open',
              per_page: 100,
              page
            });

            // Log total count on first page
            if (page === 1) {
              console.log('[Step 2.3] Total issues found:', response.total_count);
            }

            const issues = response?.items || [];
            console.log('[Step 2.4] Received', issues.length, 'issues on page', page);

            if (!issues || issues.length === 0) {
              console.log('[Step 2.5] No more issues found');
              hasMore = false;
              break;
            }

            const pageIssues = issues.map((issue: {
              id: number;
              number: number;
              title: string;
              body: string | null;
              state: string;
              labels: Array<{ name: string } | string>;
            }): Issue => ({
              id: issue.id,
              number: issue.number,
              title: issue.title,
              body: issue.body || '',
              labels: issue.labels.map(label => ({
                name: typeof label === 'string' ? label : label.name
              })),
              state: issue.state
            }));

            if (pageIssues.length === 0) {
              hasMore = false;
            } else {
              allIssues.push(...pageIssues);
              page++;
            }
          } catch (error) {
            console.error('[Step 2.X] Error fetching issues:', error);
            hasMore = false;
          }
        }

        console.log('[Step 2.6] Total issues fetched:', allIssues.length);
        return allIssues;
      });

      if (!issues) return;

      console.log('[Step 3] Creating analysis job');
      setStatus('Creating analysis job...');
      setProgress(20);

      // Get or create repository record
      console.log('[Step 3.1] Upserting repository record');
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .upsert({
          owner,
          name,
          github_id: `${owner}/${name}`
        })
        .select()
        .single();

      if (repoError) {
        console.error('[Step 3.X] Repository upsert error:', repoError);
        throw repoError;
      }

      // Create analysis job
      console.log('[Step 3.2] Creating analysis job record');
      const { data: job, error: jobError } = await supabase
        .from('analysis_jobs')
        .insert({
          repository_id: repository.id,
          status: 'queued'
        })
        .select()
        .single();

      if (jobError) {
        console.error('[Step 3.X] Job creation error:', jobError);
        throw jobError;
      }

      console.log('[Step 3.3] Analysis job created:', job);

      setStatus('Processing issues...');
      setProgress(40);

      // Create job items for each issue
      console.log('[Step 4] Creating job items');
      const jobItems = issues.map((issue: Issue) => ({
        job_id: job.id,
        issue_number: issue.number,
        issue_title: issue.title,
        issue_body: issue.body,
        labels: issue.labels.map(label => label.name),
        status: 'queued'
      }));

      console.log(`[Step 4.1] Created ${jobItems.length} job items`);

      // Insert in batches of 50
      console.log('[Step 4.2] Starting batch insertion');
      for (let i = 0; i < jobItems.length; i += 50) {
        const batch = jobItems.slice(i, i + 50);
        console.log(`[Step 4.3] Inserting batch ${Math.floor(i / 50) + 1}/${Math.ceil(jobItems.length / 50)}`);
        const { error: batchError } = await supabase
          .from('analysis_job_items')
          .insert(batch);

        if (batchError) {
          console.error('[Step 4.X] Batch insertion error:', batchError);
          throw batchError;
        }

        setProgress(40 + Math.floor((i / jobItems.length) * 30));
      }

      console.log('[Step 4.4] All job items inserted successfully');

      setStatus('Analysis queued');
      setProgress(70);

      console.log('[Step 5] Analysis job setup complete');
      toast({
        title: 'Analysis Started',
        description: `Processing ${issues.length} issues.`,
      });
    } catch (error) {
      console.error('[Error] Error in processIssues:', error);
      setIsComplete(true);
      setLoading(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process issues',
        variant: 'destructive'
      });
    }
  };

  // Monitor job progress
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    const setupSubscription = async () => {
      // Get repository ID from database
      console.log('[Monitor 1] Setting up job monitoring for:', { owner, name });
      const { data: repository } = await supabase
        .from('repositories')
        .select('id')
        .eq('owner', owner)
        .eq('name', name)
        .single();

      if (!repository) {
        console.log('[Monitor X] Repository not found, monitoring aborted');
        return;
      }

      console.log('[Monitor 2] Setting up real-time subscription for repository:', repository.id);

      channel = supabase
        .channel('analysis_progress')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'analysis_jobs',
            filter: `repository_id=eq.${repository.id}`
          },
          (payload) => {
            console.log('[Monitor 3] Received job update:', payload);
            const job = payload.new;
            if (job.status === 'processing') {
              setLoading(false);
              setStatus(job.current_step?.replace(/_/g, ' ') || 'Processing...');
              setProgress(job.progress || 0);
              setIsComplete(false);
              console.log('[Monitor 4] Job processing:', {
                step: job.current_step,
                progress: job.progress
              });
            } else if (job.status === 'completed') {
              setStatus('Analysis complete');
              setProgress(100);
              setIsComplete(true);
              setLoading(false);
              console.log('[Monitor 5] Job completed successfully');
              toast({
                title: 'Analysis Complete',
                description: 'Your repository analysis is ready to view.',
              });
            } else if (job.status === 'failed') {
              setStatus('Analysis failed');
              setIsComplete(true);
              setLoading(false);
              console.log('[Monitor X] Job failed:', job.error);
              toast({
                title: 'Analysis Failed',
                description: job.error || 'An error occurred during analysis',
                variant: 'destructive'
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('[Monitor 6] Subscription status:', status);
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [owner, name]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Repository Stats Cards */}
      <motion.div 
        className="grid grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <RepoStatsCard
          id="openIssues"
          title="Open Issues"
          value={openIssuesCount.toString()}
          description="Total open issues"
          icon={GitPullRequest}
        />
        <RepoStatsCard
          id="duplicateIssues"
          title="Duplicate Issues"
          value={duplicateCount.toString()}
          description="From last analysis"
          icon={GitMerge}
        />
        <RepoStatsCard
          id="estimatedDuplicates"
          title="Estimated Duplicates"
          value="0"
          description="Based on historical trends"
          icon={GitBranch}
        />
        <RepoStatsCard
          id="averageIssues"
          title="Average Age"
          value="0"
          description="Per open issue"
          icon={AlertCircle}
        />
      </motion.div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
              Issue Analysis
            </h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Analyze enhancement issues for duplicates
            </p>
          </div>
          <button
            onClick={processIssues}
            disabled={loading}
            className="flex items-center rounded-lg px-4 py-2"
            style={{ backgroundColor: theme.colors.brand.primary, color: theme.colors.text.primary }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            Start Analysis
          </button>
        </div>

        {(loading || progress > 0) && !isComplete && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: theme.colors.text.secondary }}>{status}</span>
              <span style={{ color: theme.colors.text.secondary }}>{progress}%</span>
            </div>
            <div
              className="h-2 rounded-full"
              style={{ backgroundColor: theme.colors.background.secondary }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: theme.colors.brand.primary
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}