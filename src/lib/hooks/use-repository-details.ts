import { useQuery } from '@tanstack/react-query';
import { useGitHub } from './use-github';
import { GitHubRepository } from '@/lib/github';

export function useRepositoryDetails(owner: string, name: string) {
    const { withGitHub } = useGitHub();

    return useQuery<GitHubRepository, Error>({
        queryKey: ['repository', owner, name],
        queryFn: async () => {
            console.log('[useRepositoryDetails] Fetching repository:', { owner, name });

            try {
                const repository = await withGitHub(async (client) => {
                    // First check repository access
                    const access = await client.checkRepositoryAccess(owner, name);

                    if (!access.hasAccess) {
                        if (access.isPrivate === null) {
                            throw new Error('Repository not found');
                        }
                        throw new Error('Private repository access denied');
                    }

                    // If we have access, get full repository details
                    const details = await client.getRepository(owner, name);

                    // Store repository data in Supabase if needed
                    // This will be handled by the search context when selecting a repository

                    return details;
                });

                return repository;
            } catch (error) {
                console.error('[useRepositoryDetails] Error:', error);
                throw error;
            }
        },
        staleTime: 30 * 1000, // Cache for 30 seconds
        retry: false, // Don't retry on 404s
    });
}
