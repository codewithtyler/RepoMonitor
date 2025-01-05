import { useState, useEffect } from 'react';
import { GitPullRequest, Search, Settings, Star, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../config/theme';
import { RepositoryList } from '@/components/repository/repository-list';
import { RepositoryDetailView } from '@/components/repository/repository-detail-view';
import { supabase } from '@/lib/auth/supabase-client';
import { useGitHub } from '@/lib/hooks/use-github';
import { toast } from '@/hooks/use-toast';
import { StatCard } from '@/components/common/stat-card';
import { DashboardLayout } from '@/components/layout/dashboard-container';

interface DashboardStats {
  openIssues: number;
  trackedRepos: number;
  analyzedRepos: number;
  activeAutomations: number;
}

interface SelectedRepository {
  owner: string;
  name: string;
  description?: string;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  subscribers_count?: number;
  last_analysis_timestamp?: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    openIssues: 0,
    trackedRepos: 0,
    analyzedRepos: 0,
    activeAutomations: 0
  });
  const [refreshing, setRefreshing] = useState<{ [key: string]: boolean }>({});
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepository | null>(null);
  const { withGitHub } = useGitHub();

  // Initial data fetch
  useEffect(() => {
    let mounted = true;

    async function fetchStats() {
      try {
        // Get count of tracked repositories
        const { count: trackedRepos, error: reposError } = await supabase
          .from('repositories')
          .select('*', { count: 'exact', head: true });

        if (reposError) throw reposError;

        // Get count of repositories analyzed in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: analyzedRepos, error: analyzedError } = await supabase
          .from('repositories')
          .select('*', { count: 'exact', head: true })
          .gte('last_analysis_timestamp', thirtyDaysAgo.toISOString());

        if (analyzedError) throw analyzedError;

        // Get count of active analysis jobs
        const { count: activeAutomations, error: automationsError } = await supabase
          .from('analysis_jobs')
          .select('*', { count: 'exact', head: true })
          .in('status', ['queued', 'processing']);

        if (automationsError) throw automationsError;

        if (mounted) {
          setStats(prev => ({
            ...prev,
            trackedRepos: trackedRepos || 0,
            analyzedRepos: analyzedRepos || 0,
            activeAutomations: activeAutomations || 0
          }));
        }

        // Get repositories for GitHub issues count
        const { data: repositories, error: repoListError } = await supabase
          .from('repositories')
          .select('owner, name');

        if (repoListError) throw repoListError;

        if (repositories && mounted) {
          let totalOpenIssues = 0;
          let failedRepos: string[] = [];

          // Process repositories in batches
          const batchSize = 2;
          for (let i = 0; i < repositories.length; i += batchSize) {
            const batch = repositories.slice(i, i + batchSize);

            for (const repo of batch) {
              try {
                const count = await withGitHub(async (client) => {
                  const response = await client.searchRepositoryIssues(repo.owner, repo.name, {
                    state: 'open',
                    per_page: 1
                  });
                  return response?.total_count || 0;
                });

                if (count !== null) {
                  totalOpenIssues += count;
                }
              } catch (error) {
                failedRepos.push(`${repo.owner}/${repo.name}`);
              }
            }

            // Add delay between batches
            if (i + batchSize < repositories.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // Update stats once at the end with final total
          if (mounted) {
            setStats(prev => ({
              ...prev,
              openIssues: totalOpenIssues
            }));

            if (failedRepos.length > 0) {
              const failedReposList = failedRepos.join(', ');
              toast({
                title: 'Warning',
                description: `Failed to fetch issues for: ${failedReposList}. Try clicking the refresh button on the Open Issues card to get the correct total.`,
                variant: 'destructive'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        if (mounted) {
          toast({
            title: 'Error',
            description: 'Failed to load some dashboard statistics.',
            variant: 'destructive'
          });
        }
      }
    }

    fetchStats();
    return () => { mounted = false; };
  }, [withGitHub]);

  // Set up real-time subscriptions for repository and job stats only
  useEffect(() => {
    // Subscribe to repository changes (tracked repos)
    const repoChannel = supabase
      .channel('repo_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repositories'
        },
        async (payload) => {
          // Update tracked repos count
          const { count: trackedRepos } = await supabase
            .from('repositories')
            .select('*', { count: 'exact', head: true });

          // Update analyzed repos count
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const { count: analyzedRepos } = await supabase
            .from('repositories')
            .select('*', { count: 'exact', head: true })
            .gte('last_analysis_timestamp', thirtyDaysAgo.toISOString());

          // Only update repository-related stats, preserve other stats including openIssues
          setStats(prev => ({
            ...prev,
            trackedRepos: trackedRepos || 0,
            analyzedRepos: analyzedRepos || 0
          }));
        }
      )
      .subscribe();

    // Subscribe to analysis jobs changes
    const jobsChannel = supabase
      .channel('jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs'
        },
        async () => {
          // Update active automations count
          const { count: activeAutomations } = await supabase
            .from('analysis_jobs')
            .select('*', { count: 'exact', head: true })
            .in('status', ['queued', 'processing']);

          // Only update automations count, preserve other stats including openIssues
          setStats(prev => ({
            ...prev,
            activeAutomations: activeAutomations || 0
          }));
        }
      )
      .subscribe();

    return () => {
      repoChannel.unsubscribe();
      jobsChannel.unsubscribe();
    };
  }, []);

  // Add refresh handlers for each stat type
  const refreshStats = {
    openIssues: async () => {
      setRefreshing(prev => ({ ...prev, openIssues: true }));
      try {
        const { data: repositories, error: repoListError } = await supabase
          .from('repositories')
          .select('owner, name');

        if (repoListError) throw repoListError;

        if (repositories) {
          let totalOpenIssues = 0;
          let failedRepos: string[] = [];

          // Process repositories in batches
          const batchSize = 2;
          for (let i = 0; i < repositories.length; i += batchSize) {
            const batch = repositories.slice(i, i + batchSize);

            for (const repo of batch) {
              try {
                const count = await withGitHub(async (client) => {
                  const response = await client.searchRepositoryIssues(repo.owner, repo.name, {
                    state: 'open',
                    per_page: 1
                  });
                  const totalCount = response?.total_count || 0;
                  return totalCount;
                });

                if (count !== null) {
                  totalOpenIssues += count;
                }
              } catch (error) {
                console.error(`Error fetching issues for ${repo.owner}/${repo.name}:`, error);
                failedRepos.push(`${repo.owner}/${repo.name}`);
              }
            }

            // Add delay between batches
            if (i + batchSize < repositories.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // Update stats once at the end with final total
          setStats(prev => ({
            ...prev,
            openIssues: totalOpenIssues
          }));

          if (failedRepos.length > 0) {
            const failedReposList = failedRepos.join(', ');
            toast({
              title: 'Warning',
              description: `Failed to fetch issues for: ${failedReposList}. Try clicking the refresh button on the Open Issues card to get the correct total.`,
              variant: 'destructive'
            });
          }
        }
      } catch (error) {
        console.error('Error refreshing open issues:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh open issues count.',
          variant: 'destructive'
        });
      } finally {
        setRefreshing(prev => ({ ...prev, openIssues: false }));
      }
    },
    trackedRepos: async () => {
      setRefreshing(prev => ({ ...prev, trackedRepos: true }));
      try {
        const { count, error } = await supabase
          .from('repositories')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        setStats(prev => ({ ...prev, trackedRepos: count || 0 }));
      } catch (error) {
        console.error('Error refreshing tracked repos:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh tracked repositories count.',
          variant: 'destructive'
        });
      } finally {
        setRefreshing(prev => ({ ...prev, trackedRepos: false }));
      }
    },
    analyzedRepos: async () => {
      setRefreshing(prev => ({ ...prev, analyzedRepos: true }));
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count, error } = await supabase
          .from('repositories')
          .select('*', { count: 'exact', head: true })
          .gte('last_analysis_timestamp', thirtyDaysAgo.toISOString());

        if (error) throw error;
        setStats(prev => ({ ...prev, analyzedRepos: count || 0 }));
      } catch (error) {
        console.error('Error refreshing analyzed repos:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh analyzed repositories count.',
          variant: 'destructive'
        });
      } finally {
        setRefreshing(prev => ({ ...prev, analyzedRepos: false }));
      }
    },
    activeAutomations: async () => {
      setRefreshing(prev => ({ ...prev, activeAutomations: true }));
      try {
        const { count, error } = await supabase
          .from('analysis_jobs')
          .select('*', { count: 'exact', head: true })
          .in('status', ['queued', 'processing']);

        if (error) throw error;
        setStats(prev => ({ ...prev, activeAutomations: count || 0 }));
      } catch (error) {
        console.error('Error refreshing active automations:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh active automations count.',
          variant: 'destructive'
        });
      } finally {
        setRefreshing(prev => ({ ...prev, activeAutomations: false }));
      }
    }
  };

  const statCards = [
    {
      key: 'openIssues',
      title: "Open Issues",
      value: stats.openIssues.toString(),
      description: "Across all tracked repositories",
      icon: GitPullRequest,
      onRefresh: refreshStats.openIssues,
      refreshing: refreshing.openIssues
    },
    {
      key: 'trackedRepos',
      title: "Tracked Repos",
      value: stats.trackedRepos.toString(),
      description: "Being monitored",
      icon: Star,
      onRefresh: refreshStats.trackedRepos,
      refreshing: refreshing.trackedRepos
    },
    {
      key: 'analyzedRepos',
      title: "Analyzed Repos",
      value: stats.analyzedRepos.toString(),
      description: "In the last 30 days",
      icon: Search,
      onRefresh: refreshStats.analyzedRepos,
      refreshing: refreshing.analyzedRepos
    },
    {
      key: 'activeAutomations',
      title: "Active Automations",
      value: stats.activeAutomations.toString(),
      description: "Currently running",
      icon: Settings,
      onRefresh: refreshStats.activeAutomations,
      refreshing: refreshing.activeAutomations
    }
  ];

  const handleRepositorySelect = async (owner: string, name: string) => {
    try {
      const repoDetails = await withGitHub(async (client) => {
        return client.getRepository(owner, name);
      });
      setSelectedRepo(repoDetails);
    } catch (error) {
      console.error('Error fetching repository details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load repository details.',
        variant: 'destructive'
      });
    }
  };

  return (
    <DashboardLayout
      stats={{
        ...stats,
        refreshing
      }}
      onRefreshStats={refreshStats}
    >
      <div className="flex-1">
        {/* Stats Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((stat) => (
            <StatCard
              key={stat.key}
              id={stat.key}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              onRefresh={stat.onRefresh}
              refreshing={stat.refreshing}
            />
          ))}
        </div>

        {/* Repository List */}
        <div className="mt-6">
          <RepositoryList onRepositorySelect={handleRepositorySelect} />
        </div>
      </div>
    </DashboardLayout>
  );
}