import { useQuery } from '@tanstack/react-query';
import { getAuthState } from '@/lib/auth/global-state';
import { getGitHubClient } from '@/lib/github';

export function useRepositoryDetails(owner: string, name: string) {
    return useQuery({
        queryKey: ['repository', owner, name],
        queryFn: async () => {
            const state = await getAuthState();
            if (!state.user) {
                throw new Error('User must be authenticated');
            }

            const client = await getGitHubClient(state.user.id);
            const repository = await client.getRepository(owner, name);
            return repository;
        },
        enabled: Boolean(owner && name)
    });
}
