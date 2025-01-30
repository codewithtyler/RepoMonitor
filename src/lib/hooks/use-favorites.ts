import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase-client';
import { getAuthState } from '@/lib/auth/global-state';

export function useFavorites() {
    return useQuery({
        queryKey: ['favorites'],
        queryFn: async () => {
            const state = await getAuthState();
            if (!state.user) {
                throw new Error('User must be authenticated');
            }

            const { data, error } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', state.user.id);

            if (error) throw error;
            return data || [];
        }
    });
}

export async function addFavorite(repositoryId: string) {
    const state = await getAuthState();
    if (!state.user) {
        throw new Error('User must be authenticated');
    }

    const { error } = await supabase
        .from('favorites')
        .insert({
            user_id: state.user.id,
            repository_id: repositoryId
        });

    if (error) throw error;
}

export async function removeFavorite(repositoryId: string) {
    const state = await getAuthState();
    if (!state.user) {
        throw new Error('User must be authenticated');
    }

    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', state.user.id)
        .eq('repository_id', repositoryId);

    if (error) throw error;
}
