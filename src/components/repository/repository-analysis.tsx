import { useState, useCallback } from 'react';
import { theme } from '@/config/theme';
import type { Repository } from '@/lib/hooks/use-repository-data';
import { RepositoryActionModal } from '../search/repository-action-modal';

interface Props {
    repository: Repository;
    onStartAnalysis: (repository: Repository) => Promise<void>;
}

type AnalysisPhase = 'not_started' | 'cloning' | 'analyzing' | 'indexing' | 'complete' | 'error';

interface AnalysisState {
    phase: AnalysisPhase;
    error?: string;
    progress?: number;
}

export function RepositoryAnalysis({ repository, onStartAnalysis }: Props) {
    const [analysisState, setAnalysisState] = useState<AnalysisState>({
        phase: repository.lastAnalysisTimestamp ? 'complete' : 'not_started'
    });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleStartAnalysis = useCallback(async () => {
        try {
            setAnalysisState({ phase: 'cloning' });
            await onStartAnalysis(repository);

            // Note: In a real implementation, we would listen to WebSocket events
            // to update these phases based on the backend progress
            setAnalysisState({ phase: 'analyzing', progress: 0 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            setAnalysisState({ phase: 'indexing', progress: 50 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            setAnalysisState({ phase: 'complete', progress: 100 });
        } catch (error) {
            setAnalysisState({
                phase: 'error',
                error: error instanceof Error ? error.message : 'Failed to analyze repository'
            });
        }
    }, [repository, onStartAnalysis]);

    const getPhaseLabel = (phase: AnalysisPhase): string => {
        switch (phase) {
            case 'not_started': return 'Start Analysis';
            case 'cloning': return 'Cloning Repository...';
            case 'analyzing': return 'Analyzing Code...';
            case 'indexing': return 'Indexing Results...';
            case 'complete': return 'Analysis Complete';
            case 'error': return 'Analysis Failed';
            default: return 'Unknown Phase';
        }
    };

    const isInProgress = ['cloning', 'analyzing', 'indexing'].includes(analysisState.phase);

    return (
        <div className="flex flex-col gap-4 p-4 rounded-lg border" style={{ borderColor: theme.colors.border.primary }}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
                    Repository Analysis
                </h3>
                {analysisState.phase === 'complete' && (
                    <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                        Last analyzed: {new Date(repository.lastAnalysisTimestamp!).toLocaleString()}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {analysisState.phase === 'not_started' && (
                    <>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                                backgroundColor: '#238636',
                                color: '#ffffff'
                            }}
                        >
                            Start Analysis
                        </button>
                        <RepositoryActionModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onTrack={async () => {
                                // Implement track functionality if needed
                                setIsModalOpen(false);
                            }}
                            onAnalyze={async () => {
                                await handleStartAnalysis();
                                setIsModalOpen(false);
                            }}
                            repository={repository}
                        />
                    </>
                )}

                {isInProgress && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                                {getPhaseLabel(analysisState.phase)}
                            </span>
                            {analysisState.progress !== undefined && (
                                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                                    {analysisState.progress}%
                                </span>
                            )}
                        </div>
                        <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ backgroundColor: theme.colors.background.secondary }}
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

                {analysisState.phase === 'complete' && (
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

                {analysisState.phase === 'error' && (
                    <div className="flex flex-col gap-2">
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
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
