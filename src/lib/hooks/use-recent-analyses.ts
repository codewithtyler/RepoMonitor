import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/auth/supabase-client';
import { getAuthState } from '@/lib/auth/global-state';
import type { Repository } from './use-repository-data';

export function useRecentAnalyses() {
    return useQuery<Repository[]>({
        queryKey: ['recent-analyses'],
        queryFn: async () => {
            const state = await getAuthState();
            if (!state.user) {
                throw new Error('User must be authenticated to fetch recent analyses');
            }

            // Get the 10 most recently analyzed repositories
            const { data, error } = await supabase
                .from('repositories')
                .select('*')
                .order('last_analysis_timestamp', { ascending: false })
                .limit(10);

            if (error) throw error;

            return data.map(repo => ({
                id: `${repo.owner}/${repo.name}`,
                github_id: repo.github_id,
                owner: repo.owner,
                name: repo.name,
                description: repo.description,
                url: repo.url,
                visibility: repo.visibility,
                stargazersCount: repo.stargazers_count,
                forksCount: repo.forks_count,
                openIssuesCount: repo.open_issues_count,
                subscribersCount: repo.subscribers_count,
                hasIssues: repo.has_issues,
                topics: repo.topics,
                size: repo.size,
                lastAnalysisTimestamp: repo.last_analysis_timestamp
            }));
        },
        staleTime: 1000 * 60 * 5 // Consider data fresh for 5 minutes
    });
}
