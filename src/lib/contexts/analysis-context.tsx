import { createContext, useContext, useState, useCallback } from 'react';
import type { Repository } from '@/lib/hooks/use-repository-data';
import type { SearchResult } from '@/lib/contexts/search-context';

type AnalysisPhase = 'not_started' | 'cloning' | 'analyzing' | 'indexing' | 'complete' | 'error';

interface AnalysisState {
    phase: AnalysisPhase;
    error?: string;
    progress?: number;
}

interface AnalysisContextType {
    selectedRepository: (Repository | SearchResult) | null;
    analysisState: AnalysisState | null;
    recentlyAnalyzed: (Repository | SearchResult)[];
    selectRepository: (repository: Repository | SearchResult) => void;
    startAnalysis: () => Promise<void>;
    clearSelection: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
    const [selectedRepository, setSelectedRepository] = useState<(Repository | SearchResult) | null>(null);
    const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
    const [recentlyAnalyzed, setRecentlyAnalyzed] = useState<(Repository | SearchResult)[]>([]);

    const selectRepository = useCallback((repository: Repository | SearchResult) => {
        setSelectedRepository(repository);
        setAnalysisState({
            phase: 'not_started',
            progress: 0
        });
    }, []);

    const startAnalysis = useCallback(async () => {
        if (!selectedRepository) return;

        try {
            // Update state to show progress
            setAnalysisState({ phase: 'cloning', progress: 0 });

            // Simulate analysis phases
            await new Promise(resolve => setTimeout(resolve, 1000));
            setAnalysisState({ phase: 'analyzing', progress: 33 });

            await new Promise(resolve => setTimeout(resolve, 1000));
            setAnalysisState({ phase: 'indexing', progress: 66 });

            await new Promise(resolve => setTimeout(resolve, 1000));
            setAnalysisState({ phase: 'complete', progress: 100 });

            // Add to recently analyzed list, keeping only the last 10
            setRecentlyAnalyzed(prev => {
                const newList = [
                    selectedRepository,
                    ...prev.filter(repo => repo.id !== selectedRepository.id)
                ].slice(0, 10);
                return newList;
            });

        } catch (error) {
            setAnalysisState({
                phase: 'error',
                error: error instanceof Error ? error.message : 'Failed to analyze repository'
            });
        }
    }, [selectedRepository]);

    const clearSelection = useCallback(() => {
        setSelectedRepository(null);
        setAnalysisState(null);
    }, []);

    return (
        <AnalysisContext.Provider
            value={{
                selectedRepository,
                analysisState,
                recentlyAnalyzed,
                selectRepository,
                startAnalysis,
                clearSelection
            }}
        >
            {children}
        </AnalysisContext.Provider>
    );
}

export function useAnalysis(): AnalysisContextType {
    const context = useContext(AnalysisContext);
    if (context === null) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
}
