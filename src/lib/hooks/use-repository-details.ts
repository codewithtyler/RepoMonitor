import { useQuery } from '@tanstack/react-query';
import { getRepository } from '../github';

export function useRepositoryDetails(owner: string, name: string) {
    console.log('[useRepositoryDetails] Initializing hook:', { owner, name });

    const { data: repository, isLoading, error } = useQuery({
        queryKey: ['repository', owner, name],
        queryFn: async () => {
            console.log('[useRepositoryDetails] Fetching repository details');
            const repo = await getRepository(owner, name);
            console.log('[useRepositoryDetails] Fetched repository:', repo);
            return repo;
        },
        enabled: !!owner && !!name,
    });

    return {
        repository,
        isLoading,
        error,
    };
}
