import { useState } from 'react';
import { Button } from '@/components/common/button';
import { PlayCircle, History } from 'lucide-react';
import { theme } from '@/config/theme';

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

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
      await onRunAnalysis();
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

      {repository.last_analysis_timestamp ? (
        <div className="space-y-4">
          {/* Analysis results will go here */}
          <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
            Previous analysis results for {repository.owner}/{repository.name}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm mb-4" style={{ color: theme.colors.text.secondary }}>
            No analysis has been run for this repository yet
          </p>
          <Button
            onClick={handleRunAnalysis}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Run Analysis
          </Button>
        </div>
      )}
    </div>
  );
} 