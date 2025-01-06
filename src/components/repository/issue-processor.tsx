import { useState, useEffect, useRef, useCallback } from 'react';
import { useGitHub } from '@/lib/hooks/use-github';
import { supabase } from '@/lib/auth/supabase-client';
import { theme } from '@/config/theme';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, GitPullRequest, GitMerge, GitBranch, CheckCircle2, Circle, FileText, RefreshCw } from 'lucide-react';
import { RepoStatsCard } from '@/components/common/repo-stats-card';
import type { GitHubClient } from '@/lib/github';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface IssueProcessorProps {
  repositoryId: string;
  owner: string;
  name: string;
}

const ANALYSIS_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes - hard timeout
const STAGE2_START_TIMEOUT_MS = 30 * 1000;  // 30 seconds - edge function should start quickly
const ANALYSIS_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes - show warning if taking too long

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

interface Stage {
  id: number;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'error';
  progress?: number;
  statusText?: string;
}

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({ progress, size = 48, strokeWidth = 4 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <motion.circle
          className="transition-all duration-700"
          stroke={theme.colors.background.secondary}
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        />
        {/* Progress circle */}
        <motion.circle
          className="transition-all duration-700"
          stroke={theme.colors.brand.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />
      </svg>
      {/* Percentage text */}
      <motion.span
        className="absolute text-sm font-medium"
        style={{ color: theme.colors.text.primary }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {Math.round(progress)}%
      </motion.span>
    </motion.div>
  );
}

function StageIndicator({ stages }: { stages: Stage[] }) {
  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={stage.id} className="relative">
          {/* Connector Line */}
          {index < stages.length - 1 && (
            <div
              className="absolute left-[15px] top-[30px] w-[2px] h-[calc(100%+16px)] -z-10"
              style={{
                backgroundColor: theme.colors.border.primary,
                opacity: stage.status === 'not-started' ? 0.3 : 1
              }}
            />
          )}

          <div className="flex items-start gap-4">
            {/* Status Icon with Progress */}
            <div className="mt-1">
              {stage.status === 'completed' && (
                <CheckCircle2 className="w-8 h-8" style={{ color: theme.colors.brand.primary }} />
              )}
              {stage.status === 'in-progress' && (
                <CircularProgress progress={stage.progress || 0} />
              )}
              {stage.status === 'not-started' && (
                <Circle className="w-8 h-8" style={{ color: theme.colors.text.secondary, opacity: 0.3 }} />
              )}
              {stage.status === 'error' && (
                <Circle className="w-8 h-8 text-red-500" />
              )}
            </div>

            {/* Stage Content */}
            <div className="flex-1">
              <h4 className="text-base font-medium" style={{ color: theme.colors.text.primary }}>
                Stage {stage.id}: {stage.title}
              </h4>
              <p className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                {stage.description}
              </p>
              {stage.status === 'in-progress' && stage.statusText && (
                <p className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                  {stage.statusText}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function IssueProcessor({ repositoryId, owner, name }: IssueProcessorProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [stage2Started, setStage2Started] = useState(false);
  const [stage2StartTimeout, setStage2StartTimeout] = useState<NodeJS.Timeout>();
  const [totalAnalysisTimeout, setTotalAnalysisTimeout] = useState<NodeJS.Timeout>();
  const [canResume, setCanResume] = useState(false);
  const { withGitHub } = useGitHub();
  const [currentStage, setCurrentStage] = useState<number>(0);
  const pollIntervalRef = useRef<number>();
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 1,
      title: "Data Collection",
      description: "Fetching issues from GitHub repository",
      status: "not-started"
    },
    {
      id: 2,
      title: "Processing Issues",
      description: "Generating embeddings for similarity detection",
      status: "not-started"
    },
    {
      id: 3,
      title: "Analyzing Issues",
      description: "Searching for potential duplicates",
      status: "not-started"
    },
    {
      id: 4,
      title: "Generating Report",
      description: "Preparing analysis results",
      status: "not-started"
    }
  ]);
  const POLL_INTERVAL = 30000; // Fixed 30-second polling interval

  const checkJobStatus = useCallback(async () => {
    const { data: activeJob } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('status', 'processing')
      .single();

    if (!activeJob) {
      // Check for cancelled job that can be resumed
      const { data: cancelledJob } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('repository_id', repositoryId)
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cancelledJob) {
        setCanResume(true);
      } else {
        setCanResume(false);
      }

      // Check if there's a completed or failed job
      const { data: lastJob } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('repository_id', repositoryId)
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastJob) {
        setLoading(false);
        setIsComplete(true);
        if (lastJob.status === 'failed') {
          setStages(prevStages => prevStages.map(stage => ({
            ...stage,
            status: stage.status === 'in-progress' ? 'error' : stage.status,
            statusText: lastJob.error
          })));
        }
      } else {
        // No job found, reset UI
        setLoading(false);
        setIsComplete(false);
        setStages(prevStages => prevStages.map(stage => ({
          ...stage,
          status: 'not-started',
          progress: 0,
          statusText: undefined
        })));
      }
      setStartTime(null);
      return;
    }

    // Check if analysis has exceeded timeout
    if (activeJob.created_at) {
      const startedAt = new Date(activeJob.created_at).getTime();
      const now = new Date().getTime();
      if (now - startedAt >= ANALYSIS_TIMEOUT_MS) {
        // Auto-cancel the analysis
        await supabase
          .from('analysis_jobs')
          .update({
            status: 'cancelled',
            error: 'Analysis exceeded maximum time limit of 15 minutes'
          })
          .eq('id', activeJob.id);

        setStages(prevStages => prevStages.map(stage => ({
          ...stage,
          status: stage.status === 'in-progress' ? 'error' : stage.status,
          statusText: stage.status === 'in-progress' ? 'Analysis exceeded time limit' : stage.statusText
        })));
        setIsComplete(true);
        setLoading(false);
        setCanResume(true);

        toast({
          title: 'Analysis Cancelled',
          description: 'Analysis exceeded maximum time limit of 15 minutes. You can resume the analysis to continue.',
          variant: 'destructive'
        });

        return;
      }
    }

    setLoading(true);
    setCurrentStage(activeJob.processing_stage_number);
    setStartTime(activeJob.created_at);

    // Check if we've moved to Stage 2
    if (activeJob.processing_stage_number === 2) {
      setStage2Started(true);
    }

    // Calculate stage progress
    const stageProgress = activeJob.stage_progress || 0;
    const processedCount = activeJob.processed_issues_count || 0;
    const totalCount = activeJob.total_issues_count || 0;

    setStages(prevStages => prevStages.map(stage => {
      if (stage.id < activeJob.processing_stage_number) {
        // Previous stages are complete
        return {
          ...stage,
          status: 'completed',
          progress: 100,
          statusText: stage.id === 1 ? `Processed ${totalCount} issues` : undefined
        };
      } else if (stage.id === activeJob.processing_stage_number) {
        // Current stage is in progress
        let progress = 0;
        let statusText = "";
        if (stage.id === 1) {
          // For Stage 1, calculate progress based on processed vs total issues
          progress = totalCount ? Math.round((processedCount / totalCount) * 100) : 0;
          if (processedCount === totalCount) {
            statusText = `Fetched ${totalCount} issues`;
          }
          else {
            statusText = totalCount ? `Fetching ${processedCount} of ${totalCount} issues...` : 'Initializing...';
          }
        } else if (stage.id === 2) {
          // For Stage 2, use the stage_progress directly
          progress = stageProgress;
          statusText = `Generating embeddings for ${processedCount} of ${totalCount} issues...`;
        } else {
          progress = stageProgress;
          statusText = stage.description;
        }
        return {
          ...stage,
          status: 'in-progress',
          progress,
          statusText
        };
      }
      // Future stages are not started
      return { ...stage, status: 'not-started', progress: 0, statusText: undefined };
    }));

    // If Stage 1 is complete but Stage 2 hasn't started after timeout, mark as failed
    if (activeJob.processing_stage_number === 1 && activeJob.stage_progress === 100 && !stage2Started) {
      if (!stage2StartTimeout) {
        const timeout = setTimeout(async () => {
          // Update job status to failed and set the correct processing stage
          await supabase
            .from('analysis_jobs')
            .update({
              status: 'failed',
              error: 'Stage 2 (Embedding) did not start within 30 seconds. This could be due to edge function issues or rate limits. Please try again.',
              processing_stage: 'embedding',
              processing_stage_number: 2,
              stage_progress: 0
            })
            .eq('id', activeJob.id);

          // Update UI to show Stage 1 as complete and Stage 2 as error
          setStages(prevStages => prevStages.map(stage => {
            if (stage.id === 1) {
              return { ...stage, status: 'completed', progress: 100 };
            }
            if (stage.id === 2) {
              return {
                ...stage,
                status: 'error',
                statusText: 'Failed to start embedding process - timeout after 30 seconds'
              };
            }
            return { ...stage, status: 'not-started', progress: 0 };
          }));
          setIsComplete(true);
          setLoading(false);

          toast({
            title: 'Analysis Failed',
            description: 'Stage 2 (Embedding) did not start within 30 seconds. This could be due to edge function issues or rate limits. Please try again.',
            variant: 'destructive'
          });
        }, STAGE2_START_TIMEOUT_MS);
        setStage2StartTimeout(timeout);
      }
    }
  }, [repositoryId, setStages, setIsComplete, setLoading, setCanResume]);

  // Start polling on mount
  useEffect(() => {
    checkJobStatus(); // Initial check
    pollIntervalRef.current = window.setInterval(checkJobStatus, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (stage2StartTimeout) {
        clearTimeout(stage2StartTimeout);
      }
      if (totalAnalysisTimeout) {
        clearTimeout(totalAnalysisTimeout);
      }
    };
  }, [checkJobStatus, stage2StartTimeout, totalAnalysisTimeout]);

  // Clear polling when job completes
  useEffect(() => {
    if (isComplete && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  }, [isComplete]);

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

  const updateStageProgress = (stageId: number, progress: number, statusText?: string) => {
    setStages(prevStages => prevStages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          status: 'in-progress',
          progress,
          statusText
        };
      } else if (stage.id < stageId) {
        return {
          ...stage,
          status: 'completed',
          progress: 100
        };
      }
      return stage;
    }));
  };

  const completeStage = (stageId: number) => {
    setStages(prevStages => prevStages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          status: 'completed',
          progress: 100
        };
      } else if (stage.id === stageId + 1) {
        return {
          ...stage,
          status: 'in-progress',
          progress: 0
        };
      }
      return stage;
    }));
  };

  const processIssues = async () => {
    try {
      // Check for existing job
      const { data: existingJob } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('repository_id', repositoryId)
        .eq('status', 'processing')
        .single();

      if (existingJob) {
        // If job is stale (no updates in last 5 minutes), clean it up
        const lastUpdate = new Date(existingJob.last_processed_at);
        const isStale = (new Date().getTime() - lastUpdate.getTime()) > 5 * 60 * 1000;

        if (isStale) {
          // Clean up stale job
          await supabase
            .from('analysis_jobs')
            .update({ status: 'failed', error: 'Job timed out' })
            .eq('id', existingJob.id);

          // Clean up job items
          await supabase
            .from('analysis_job_items')
            .delete()
            .eq('job_id', existingJob.id);
        } else {
          // Resume existing job
          setStages(prevStages => prevStages.map(stage => {
            if (stage.id < existingJob.processing_stage_number) {
              return { ...stage, status: 'completed', progress: 100 };
            } else if (stage.id === existingJob.processing_stage_number) {
              return {
                ...stage,
                status: 'in-progress',
                progress: existingJob.stage_progress,
                statusText: `Resuming from ${existingJob.processed_issues_count} processed issues...`
              };
            }
            return { ...stage, status: 'not-started', progress: 0 };
          }));

          setLoading(true);
          setIsComplete(false);
          return; // Exit early as we're just resuming
        }
      }

      // Start new job
      setStages(prevStages => prevStages.map(stage => ({
        ...stage,
        status: 'not-started',
        progress: 0,
        statusText: undefined
      })));

      // Start or resume job
      const { data: job, error: jobError } = await supabase
        .from('analysis_jobs')
        .upsert({
          repository_id: repositoryId,
          status: 'processing',
          processing_stage: 'fetching',
          processing_stage_number: 1,
          stage_progress: 0,
          ...(existingJob ? { id: existingJob.id } : {})
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Stage 1: Data Collection
      updateStageProgress(1, 0, 'Initializing data collection...');

      // Get total issue count first
      const totalCount = await withGitHub(async (client: GitHubClient) => {
        const response = await client.searchRepositoryIssues(owner, name, {
          state: 'open',
          per_page: 1
        });
        return response.total_count || 0;
      });

      // Update job with total count
      await supabase
        .from('analysis_jobs')
        .update({ total_issues_count: totalCount })
        .eq('id', job.id);

      // Fetch and process issues in batches
      let page = Math.floor((existingJob?.processed_issues_count || 0) / 100) + 1;
      let processedCount = existingJob?.processed_issues_count || 0;
      let hasMore = true;

      while (hasMore) {
        const stageProgress = Math.min((processedCount / totalCount) * 100, 100);
        updateStageProgress(1, stageProgress, `Fetching page ${page} of ${Math.ceil(totalCount / 100)}...`);

        const issues = await withGitHub(async (client: GitHubClient) => {
          const response = await client.searchRepositoryIssues(owner, name, {
            state: 'open',
            per_page: 100,
            page
          });
          return response.items || [];
        });

        if (!issues.length) {
          hasMore = false;
          break;
        }

        // Process each batch immediately
        const batch = issues.map((issue: any): Issue => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          labels: issue.labels.map((label: { name: string } | string) => ({
            name: typeof label === 'string' ? label : label.name
          })),
          state: issue.state
        }));

        // Store raw issues and create job items
        const jobItems = batch.map((issue: Issue) => ({
          job_id: job.id,
          issue_number: issue.number,
          issue_title: issue.title,
          issue_body: issue.body,
          status: 'queued',
          embedding_status: 'pending'
        }));

        const { error: batchError } = await supabase
          .from('analysis_job_items')
          .upsert(jobItems);

        if (batchError) throw batchError;

        processedCount += batch.length;
        page++;

        // Update job progress
        await supabase
          .from('analysis_jobs')
          .update({
            processed_issues_count: processedCount,
            last_processed_issue_number: batch[batch.length - 1].number,
            stage_progress: stageProgress
          })
          .eq('id', job.id);
      }

      // Complete Stage 1
      completeStage(1);

      // Stage 2: Processing (Embeddings)
      updateStageProgress(2, 0, 'Starting embedding generation...');
      await supabase
        .from('analysis_jobs')
        .update({
          processing_stage: 'embedding',
          processing_stage_number: 2,
          stage_progress: 0
        })
        .eq('id', job.id);

      // Processing will continue in the edge function
      // We just need to monitor progress via the subscription

      toast({
        title: 'Analysis Started',
        description: `Processing ${totalCount} issues.`,
      });
    } catch (error) {
      console.error('[Error] Error in processIssues:', error);
      setStages(prevStages => prevStages.map(stage => ({
        ...stage,
        status: stage.status === 'in-progress' ? 'error' : stage.status
      })));
      setIsComplete(true);
      setLoading(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process issues',
        variant: 'destructive'
      });
    }
  };

  // Update monitoring to handle new progress tracking
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    const setupSubscription = async () => {
      const { data: repository } = await supabase
        .from('repositories')
        .select('id')
        .eq('owner', owner)
        .eq('name', name)
        .single();

      if (!repository) return;

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
          async (payload) => {
            const job = payload.new;

            // Check if analysis has exceeded timeout
            if (job.created_at && job.status === 'processing') {
              const startedAt = new Date(job.created_at).getTime();
              const now = new Date().getTime();
              if (now - startedAt >= ANALYSIS_TIMEOUT_MS) {
                // Auto-cancel the analysis
                await supabase
                  .from('analysis_jobs')
                  .update({
                    status: 'cancelled',
                    error: 'Analysis exceeded maximum time limit of 15 minutes'
                  })
                  .eq('id', job.id);

                setStages(prevStages => prevStages.map(stage => ({
                  ...stage,
                  status: stage.status === 'in-progress' ? 'error' : stage.status,
                  statusText: stage.status === 'in-progress' ? 'Analysis exceeded time limit' : stage.statusText
                })));
                setIsComplete(true);
                setLoading(false);
                setCanResume(true);
                return;
              }
            }

            // Rest of the existing switch case for processing_stage
            switch (job.processing_stage) {
              case 'fetching':
                updateStageProgress(1, job.stage_progress,
                  `Fetched ${job.processed_issues_count} of ${job.total_issues_count} issues...`);
                break;
              case 'embedding':
                updateStageProgress(2, job.stage_progress,
                  `Processed ${job.embedded_issues_count} of ${job.total_issues_count} issues...`);
                break;
              case 'analyzing':
                updateStageProgress(3, job.stage_progress,
                  `Analyzing similarities...`);
                break;
              case 'reporting':
                updateStageProgress(4, job.stage_progress,
                  `Generating final report...`);
                break;
            }

            if (job.status === 'completed') {
              completeStage(3);
              completeStage(4);
              setIsComplete(true);
              setLoading(false);
              toast({
                title: 'Analysis Complete',
                description: 'Your repository analysis is ready to view.',
              });
            } else if (job.status === 'failed') {
              setStages(prevStages => prevStages.map(stage => ({
                ...stage,
                status: stage.status === 'in-progress' ? 'error' : stage.status,
                statusText: job.error
              })));
              setIsComplete(true);
              setLoading(false);
              toast({
                title: 'Analysis Failed',
                description: job.error || 'An error occurred during analysis',
                variant: 'destructive'
              });
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        console.log('Cleaning up Supabase channel...');
        channel.unsubscribe();
      }
      // Clear all intervals and timeouts
      if (pollIntervalRef.current) {
        console.log('Cleaning up polling interval...');
        clearInterval(pollIntervalRef.current);
      }
      if (stage2StartTimeout) {
        clearTimeout(stage2StartTimeout);
      }
      if (totalAnalysisTimeout) {
        clearTimeout(totalAnalysisTimeout);
      }
    };
  }, [owner, name]);

  const stopAnalysis = async () => {
    try {
      const { data: activeJob } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('repository_id', repositoryId)
        .eq('status', 'processing')
        .single();

      if (activeJob) {
        await supabase
          .from('analysis_jobs')
          .update({
            status: 'cancelled',
            error: 'Analysis cancelled by user'
          })
          .eq('id', activeJob.id);

        setStages(prevStages => prevStages.map(stage => ({
          ...stage,
          status: stage.status === 'in-progress' ? 'error' : stage.status,
          statusText: stage.status === 'in-progress' ? 'Analysis cancelled' : stage.statusText
        })));
        setIsComplete(true);
        setLoading(false);
        setCanResume(true);
      }
    } catch (error) {
      console.error('Error stopping analysis:', error);
    }
  };

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
          title="Duplicate Issues - Coming Soon™"
          value={duplicateCount.toString()}
          description="From last analysis"
          icon={GitMerge}
        />
        <RepoStatsCard
          id="estimatedDuplicates"
          title="Est. Duplicates - Coming Soon™"
          value="0"
          description="Based on historical trends"
          icon={GitBranch}
        />
        <RepoStatsCard
          id="averageIssues"
          title="Average Age - Coming Soon™"
          value="0"
          description="Per open issue"
          icon={AlertCircle}
        />
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
              Issue Analysis
            </h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {loading ? (
                <>
                  Analysis in progress - please do not close this window
                  {startTime && (
                    <span className="ml-1 opacity-75">
                      (Started {formatDistanceToNow(new Date(startTime))} ago)
                    </span>
                  )}
                </>
              ) : (
                'Analyze enhancement issues for duplicates'
              )}
            </p>
          </div>
          <button
            onClick={loading ? stopAnalysis : canResume ? processIssues : processIssues}
            disabled={loading && currentStage === 1 && stages[0].status === 'completed' && !stage2Started}
            className="flex items-center rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.colors.brand.primary, color: theme.colors.text.primary }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analysis in Progress
              </>
            ) : canResume ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Resume Analysis
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Start Analysis
              </>
            )}
          </button>
        </div>

        {/* Stage Indicator */}
        <StageIndicator stages={stages} />
      </div>
    </div>
  );
}
