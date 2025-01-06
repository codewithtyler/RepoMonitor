import { useState, useEffect } from 'react';
import { useGitHub } from '@/lib/hooks/use-github';
import { supabase } from '@/lib/auth/supabase-client';
import { theme } from '@/config/theme';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import type { GitHubClient } from '@/lib/github';

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

export function IssueProcessor({ repositoryId, owner, name }: IssueProcessorProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const { withGitHub } = useGitHub();

  const processIssues = async () => {
    try {
      console.log('Starting analysis for:', owner, name);
      setLoading(true);
      setIsComplete(false);
      setStatus('Fetching issues...');
      setProgress(0);

      // Get all issues
      console.log('Fetching issues from GitHub...');
      const issues = await withGitHub(async (client: GitHubClient) => {
        console.log('GitHub client initialized');
        const allIssues: Issue[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          console.log('Fetching page', page);
          try {
            const response = await client.searchRepositoryIssues(owner, name, {
              state: 'open',
              per_page: 100,
              page
            });

            // Log total count on first page
            if (page === 1) {
              console.log('Total issues found:', response.total_count);
            }

            const issues = response?.items || [];
            console.log('Received', issues.length, 'issues');

            if (!issues || issues.length === 0) {
              console.log('No more issues found');
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
            console.error('Error fetching issues:', error);
            hasMore = false;
          }
        }

        console.log('Total issues fetched:', allIssues.length);
        return allIssues;
      });

      if (!issues) return;

      setStatus('Creating analysis job...');
      setProgress(20);

      // Get or create repository record
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .upsert({
          owner,
          name,
          github_id: `${owner}/${name}`
        })
        .select()
        .single();

      if (repoError) throw repoError;

      // Create analysis job
      const { data: job, error: jobError } = await supabase
        .from('analysis_jobs')
        .insert({
          repository_id: repository.id,
          status: 'queued'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      console.log('Analysis job created:', job);

      setStatus('Processing issues...');
      setProgress(40);

      // Create job items for each issue
      const jobItems = issues.map((issue: Issue) => ({
        job_id: job.id,
        issue_number: issue.number,
        issue_title: issue.title,
        issue_body: issue.body,
        labels: issue.labels.map(label => label.name),
        status: 'queued'
      }));

      console.log(`Created ${jobItems.length} job items`);

      // Insert in batches of 50
      for (let i = 0; i < jobItems.length; i += 50) {
        const batch = jobItems.slice(i, i + 50);
        const { error: batchError } = await supabase
          .from('analysis_job_items')
          .insert(batch);

        if (batchError) throw batchError;

        setProgress(40 + Math.floor((i / jobItems.length) * 30));
      }

      console.log('All job items inserted');

      setStatus('Analysis queued');
      setProgress(70);

      toast({
        title: 'Analysis Started',
        description: `Processing ${issues.length} issues.`,
      });
    } catch (error) {
      console.error('Error in processIssues:', error);
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
      const { data: repository } = await supabase
        .from('repositories')
        .select('id')
        .eq('owner', owner)
        .eq('name', name)
        .single();

      if (!repository) return;

      console.log('Setting up real-time subscription for repository:', repository.id);

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
            console.log('Received job update:', payload);
            const job = payload.new;
            if (job.status === 'processing') {
              setLoading(false);
              setStatus(job.current_step?.replace(/_/g, ' ') || 'Processing...');
              setProgress(job.progress || 0);
              setIsComplete(false);
              console.log('Job processing:', job.current_step, job.progress);
            } else if (job.status === 'completed') {
              setStatus('Analysis complete');
              setProgress(100);
              setIsComplete(true);
              setLoading(false);
              console.log('Job completed');
              toast({
                title: 'Analysis Complete',
                description: 'Your repository analysis is ready to view.',
              });
            } else if (job.status === 'failed') {
              setStatus('Analysis failed');
              setIsComplete(true);
              setLoading(false);
              console.log('Job failed:', job.error);
              toast({
                title: 'Analysis Failed',
                description: job.error || 'An error occurred during analysis',
                variant: 'destructive'
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [owner, name]);

  return (
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
  );
}