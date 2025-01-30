import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase-client';
import { useUser } from '@/lib/auth/hooks';

export function useTrackedRepositories() {
    const { user } = useUser();

    return useQuery({
        queryKey: ['tracked-repositories'],
        queryFn: async () => {
            if (!user) {
                throw new Error('User must be authenticated to fetch tracked repositories');
            }

            const { data, error, count } = await supabase
                .from('repositories')
                .select('*', { count: 'exact' });

            if (error) {
                throw error;
            }

            return {
                repositories: data || [],
                count: count || 0
            };
        },
        enabled: !!user
    });
}
