import { theme } from '@/config/theme';
import { Loader2 } from 'lucide-react';

interface AnalysisJob {
    id: string;
    status: string;
    progress?: number;
    stage?: string;
    error?: string;
}

interface ActiveAnalysisCardProps {
    job: AnalysisJob;
}

export function ActiveAnalysisCard({ job }: ActiveAnalysisCardProps) {
    const getStatusLabel = () => {
        switch (job.status) {
            case 'fetching':
                return 'Fetching issues...';
            case 'processing':
                return 'Processing embeddings...';
            case 'analyzing':
                return 'Analyzing duplicates...';
            case 'completed':
                return 'Analysis complete';
            case 'failed':
                return 'Analysis failed';
            default:
                return 'Processing...';
        }
    };

    const isInProgress = ['fetching', 'processing', 'analyzing'].includes(job.status);

    return (
        <div className="p-6 rounded-lg border" style={{ borderColor: theme.colors.border.primary, backgroundColor: theme.colors.background.secondary }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
                    Active Analysis
                </h3>
            </div>

            <div className="space-y-4">
                {isInProgress && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                                    {getStatusLabel()}
                                </span>
                            </div>
                            {job.progress !== undefined && (
                                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                                    {job.progress}%
                                </span>
                            )}
                        </div>
                        <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ backgroundColor: theme.colors.background.primary }}
                        >
                            <div
                                className="h-full transition-all duration-500 ease-in-out"
                                style={{
                                    width: `${job.progress || 0}%`,
                                    backgroundColor: theme.colors.brand.primary
                                }}
                            />
                        </div>
                    </div>
                )}

                {job.status === 'completed' && (
                    <div className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.colors.success.primary }}
                        />
                        <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                            Analysis Complete
                        </span>
                    </div>
                )}

                {job.status === 'failed' && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: theme.colors.error.primary }}
                            />
                            <span className="text-sm" style={{ color: theme.colors.error.primary }}>
                                Analysis Failed
                            </span>
                        </div>
                        {job.error && (
                            <p className="text-sm" style={{ color: theme.colors.error.primary }}>
                                {job.error}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
