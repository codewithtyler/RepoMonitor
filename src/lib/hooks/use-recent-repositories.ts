import { useEffect, useState } from 'react';
import { supabase } from '../auth/supabase-client';

interface Repository {
  id: number;
  name: string;
  owner: string;
  last_analysis_timestamp: string | null;
}

export function useRecentRepositories() {
  const [recentlyTracked, setRecentlyTracked] = useState<Repository[]>([]);
  const [recentlyAnalyzed, setRecentlyAnalyzed] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRecentRepositories() {
    try {
      // Fetch recently tracked repositories
      const { data: tracked, error: trackedError } = await supabase
        .from('repositories')
        .select('id, name, owner, last_analysis_timestamp')
        .order('created_at', { ascending: false })
        .limit(10);

      if (trackedError) throw trackedError;
      setRecentlyTracked(tracked || []);

      // Fetch recently analyzed repositories
      const { data: analyzed, error: analyzedError } = await supabase
        .from('repositories')
        .select('id, name, owner, last_analysis_timestamp')
        .not('last_analysis_timestamp', 'is', null)
        .order('last_analysis_timestamp', { ascending: false })
        .limit(10);

      if (analyzedError) throw analyzedError;
      setRecentlyAnalyzed(analyzed || []);
    } catch (error) {
      console.error('[useRecentRepositories] Error fetching recent repositories:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchRecentRepositories();

    // Subscribe to repository changes
    const channel = supabase
      .channel('recent_repos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repositories'
        },
        () => {
          // Refetch both lists when any change occurs
          fetchRecentRepositories();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    recentlyTracked,
    recentlyAnalyzed,
    loading
  };
} 