import { useCallback } from 'react';
import type { Repository } from './use-repository-data';
import type { SearchResult } from '@/lib/contexts/search-context';
import { useAnalysis } from '@/lib/contexts/analysis-context';

export function useRepositorySelection() {
    const { selectRepository } = useAnalysis();

    const handleRepositorySelect = useCallback((repository: Repository | SearchResult) => {
        selectRepository(repository);
    }, [selectRepository]);

    return {
        handleRepositorySelect
    };
}
