import { useAnalysis } from '@/lib/contexts/analysis-context';
import { useRepositoriesData } from '@/lib/hooks/use-repository-data';
import { useActiveAnalyses } from '@/lib/contexts/active-analyses-context';
import { theme } from '@/config/theme';
import { Loader2 } from 'lucide-react';
import { useCallback } from 'react';

export function RepositoryAnalysisCard() {
    const { selectedRepository, analysisState, startAnalysis } = useAnalysis();
    const { refetch: refetchRepositories } = useRepositoriesData();
    const { incrementActiveCount, decrementActiveCount } = useActiveAnalyses();

    if (!selectedRepository) return null;

    const handleStartAnalysis = useCallback(async () => {
        incrementActiveCount();
        await startAnalysis();
        decrementActiveCount();
        // Refetch repositories to update stats and cards
        await refetchRepositories();
    }, [startAnalysis, incrementActiveCount, decrementActiveCount, refetchRepositories]);

    const getPhaseLabel = () => {
        if (!analysisState) return '';
        switch (analysisState.phase) {
            case 'not_started': return 'Ready to analyze';
            case 'cloning': return 'Cloning repository...';
            case 'analyzing': return 'Analyzing code...';
            case 'indexing': return 'Indexing results...';
            case 'complete': return 'Analysis complete';
            case 'error': return 'Analysis failed';
            default: return '';
        }
    };

    const isInProgress = analysisState?.phase && ['cloning', 'analyzing', 'indexing'].includes(analysisState.phase);

    return (
        <div className="p-6 rounded-lg border" style={{ borderColor: theme.colors.border.primary, backgroundColor: theme.colors.background.secondary }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
                    {selectedRepository.owner}/{selectedRepository.name}
                </h3>
            </div>

            <div className="space-y-4">
                {analysisState?.phase === 'not_started' && (
                    <button
                        onClick={handleStartAnalysis}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: theme.colors.brand.primary,
                            color: theme.colors.text.inverse
                        }}
                    >
                        Start Analysis
                    </button>
                )}

                {isInProgress && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                                    {getPhaseLabel()}
                                </span>
                            </div>
                            {analysisState.progress !== undefined && (
                                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                                    {analysisState.progress}%
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
                                    width: `${analysisState.progress || 0}%`,
                                    backgroundColor: theme.colors.brand.primary
                                }}
                            />
                        </div>
                    </div>
                )}

                {analysisState?.phase === 'complete' && (
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

                {analysisState?.phase === 'error' && (
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
                        {analysisState.error && (
                            <p className="text-sm" style={{ color: theme.colors.error.primary }}>
                                {analysisState.error}
                            </p>
                        )}
                        <button
                            onClick={handleStartAnalysis}
                            className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                                backgroundColor: theme.colors.error.primary,
                                color: theme.colors.text.inverse
                            }}
                        >
                            Retry Analysis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
