import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth/supabase-client';
import { Button } from '@/components/common/button';
import { theme } from '@/config/theme';

interface DuplicateIssue {
  id: number;
  number: number;
  title: string;
  confidence: number;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  labels: string[];
  duplicates: DuplicateIssue[];
}

interface AnalysisJob {
  id: string;
  status: string;
  results: Issue[];
}

interface IssueProcessorProps {
  repositoryId: number;
  owner: string;
  name: string;
  onJobUpdate: (job: AnalysisJob | null) => void;
  onDuplicateCountChange: (count: number) => void;
}

export function IssueProcessor({
  repositoryId,
  owner,
  name,
  onJobUpdate,
  onDuplicateCountChange
}: IssueProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    status: string;
    message: string;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const subscription = supabase
      .channel('analysis_jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `repository_id=eq.${repositoryId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const job = payload.new;
            setIsProcessing(job.status !== 'completed' && job.status !== 'failed');

            if (job.status === 'completed') {
              const { data: results, error } = await supabase
                .from('duplicate_issues')
                .select('*')
                .eq('repository_id', repositoryId)
                .not('confidence_score', 'is', null);

              if (!error && results) {
                onJobUpdate({
                  id: job.id,
                  status: job.status,
                  results: results.map(issue => ({
                    id: issue.issue_id,
                    number: issue.issue_number,
                    title: issue.issue_title,
                    labels: issue.labels || [],
                    duplicates: (issue.duplicates || []).map((dup: DuplicateIssue) => ({
                      id: dup.id,
                      number: dup.number,
                      title: dup.title,
                      confidence: dup.confidence
                    }))
                  }))
                });
                onDuplicateCountChange(results.length);
              }
            } else if (job.status === 'failed') {
              setIsProcessing(false);
              onJobUpdate(null);
            } else {
              onJobUpdate({
                id: job.id,
                status: job.status,
                results: []
              });
            }

            setProgress({
              status: job.status,
              message: job.status_message || '',
              percentage: job.progress || 0
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [repositoryId, onJobUpdate, onDuplicateCountChange]);

  const handleStartAnalysis = async () => {
    try {
      setIsProcessing(true);
      const { error } = await supabase.functions.invoke('start-analysis', {
        body: { repositoryId, owner, name }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
          Issue Analysis
        </h3>
        <Button
          onClick={handleStartAnalysis}
          disabled={isProcessing}
          variant="primary"
        >
          {isProcessing ? 'Processing...' : 'Start Analysis'}
        </Button>
      </div>

      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm capitalize" style={{ color: theme.colors.text.secondary }}>
              {progress.status}
            </span>
            <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${progress.percentage}%`,
                backgroundColor: theme.colors.brand.primary
              }}
            />
          </div>
          {progress.message && (
            <p className="text-sm mt-2" style={{ color: theme.colors.text.secondary }}>
              {progress.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
