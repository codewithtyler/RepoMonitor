import { useState, useEffect } from 'react';
import { useGitHub } from '@/lib/hooks/use-github';
import { supabase } from '@/lib/auth/supabase-client';
import { theme } from '@/config/theme';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import type { GitHubClient } from '@/lib/github';
import type { RestEndpointMethodTypes } from '@octokit/rest';

interface IssueProcessorProps {
  repositoryId: string;
  owner: string;
  name: string;
}

type GitHubIssue = RestEndpointMethodTypes['issues']['listForRepo']['response']['data'][number];
type GitHubLabel = GitHubIssue['labels'][number];

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
  const { withGitHub } = useGitHub();

  const processIssues = async () => {
    try {
      setLoading(true);
      setStatus('Fetching issues...');
      setProgress(0);

      // Get all issues
      const issues = await withGitHub(async (client: GitHubClient) => {
        const allIssues: Issue[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await client.listRepositoryIssues(owner, name, {
            state: 'all',
            per_page: 100,
            page
          });

          const pageIssues = response.data.map((issue: GitHubIssue): Issue => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            labels: issue.labels.map((label: GitHubLabel) => ({
              name: typeof label === 'string' ? label : label.name || 'unknown'
            })),
            state: issue.state
          }));

          if (pageIssues.length === 0) {
            hasMore = false;
          } else {
            allIssues.push(...pageIssues);
            page++;
          }
        }

        return allIssues;
      });

      if (!issues) return;

      // Filter for enhancement-labeled issues
      const enhancements = issues.filter((issue: Issue) =>
        issue.labels.some((label: Label) =>
          label.name.toLowerCase().includes('enhancement') ||
          label.name.toLowerCase().includes('feature')
        )
      );

      setStatus('Creating analysis job...');
      setProgress(20);

      // Create analysis job
      const { data: job, error: jobError } = await supabase
        .from('analysis_jobs')
        .insert({
          repository_id: repositoryId,
          status: 'queued'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setStatus('Processing issues...');
      setProgress(40);

      // Create job items for each issue
      const jobItems = enhancements.map((issue: Issue) => ({
        job_id: job.id,
        issue_number: issue.number,
        issue_title: issue.title,
        issue_body: issue.body,
        status: 'queued'
      }));

      // Insert in batches of 50
      for (let i = 0; i < jobItems.length; i += 50) {
        const batch = jobItems.slice(i, i + 50);
        const { error: batchError } = await supabase
          .from('analysis_job_items')
          .insert(batch);

        if (batchError) throw batchError;

        setProgress(40 + Math.floor((i / jobItems.length) * 30));
      }

      setStatus('Analysis queued');
      setProgress(100);

      toast({
        title: 'Analysis Started',
        description: `Processing ${enhancements.length} enhancement issues.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process issues',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Monitor job progress
  useEffect(() => {
    const channel = supabase
      .channel('analysis_progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `repository_id=eq.${repositoryId}`
        },
        (payload) => {
          const job = payload.new;
          if (job.status === 'processing') {
            setStatus(job.current_step?.replace(/_/g, ' ') || 'Processing...');
            setProgress(job.progress || 0);
          } else if (job.status === 'completed') {
            setStatus('Analysis complete');
            setProgress(100);
            toast({
              title: 'Analysis Complete',
              description: 'Your repository analysis is ready to view.',
            });
          } else if (job.status === 'failed') {
            setStatus('Analysis failed');
            toast({
              title: 'Analysis Failed',
              description: job.error || 'An error occurred during analysis',
              variant: 'destructive'
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [repositoryId]);

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

      {(loading || progress > 0) && (
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