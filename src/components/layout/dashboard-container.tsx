import * as React from 'react';
import { HeaderLogo } from './header-logo';
import { theme } from '../../config/theme';
import { useUser } from '../../lib/auth/hooks';
import { ChevronDown, LogOut, GitFork, Search, RefreshCw, GitPullRequest, Settings, Star, LucideIcon } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/auth/supabase-client';
import { useNavigate } from 'react-router-dom';
import { useGitHub } from '@/lib/hooks/use-github';
import { useSearch } from '@/lib/contexts/search-context';
import { SearchResultsDropdown } from '../search/search-results-dropdown';
import { RepositoryActionModal } from '../search/repository-action-modal';
import { toast } from '../../hooks/use-toast';
import { useRecentRepositories } from '@/lib/hooks/use-recent-repositories';
import { IssueProcessor } from '@/components/repository/issue-processor';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from '@/components/common/stat-card';
import { GlobalStatsCard } from '@/components/common/global-stats-card';
import { Tooltip } from '@/components/common/tooltip';

interface Repository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  private: boolean;
  stargazers_count: number;
}

interface StatCardData {
  key: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  onRefresh?: () => void;
  refreshing?: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  stats?: {
    openIssues: number;
    trackedRepos: number;
    analyzedRepos: number;
    activeAutomations: number;
    refreshing?: {
      openIssues?: boolean;
      trackedRepos?: boolean;
      analyzedRepos?: boolean;
      activeAutomations?: boolean;
    };
  };
  onRefreshStats?: {
    openIssues: () => void;
    trackedRepos: () => void;
    analyzedRepos: () => void;
    activeAutomations: () => void;
  };
}

export function DashboardLayout({ children, stats, onRefreshStats }: DashboardLayoutProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const firstName = user?.user_metadata?.name?.split(' ')[0] || 'there';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const { loading: githubLoading, withGitHub } = useGitHub();
  const { searchQuery, setSearchQuery, triggerSearch } = useSearch();
  const [searchResults, setSearchResults] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const { recentlyTracked, recentlyAnalyzed, loading: recentLoading } = useRecentRepositories();
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedAnalysisRepo, setSelectedAnalysisRepo] = useState<{
    owner: string;
    name: string;
    id?: string;
  } | null>(null);
  const [isAnalysisView, setIsAnalysisView] = useState(false);
  const statsCardsRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!user) {
      console.log('[Step 2] Search aborted: No user found');
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('[Step 2] Searching GitHub repositories with query:', searchQuery);
      const results = await withGitHub(async (client) => {
        const response = await client.listUserRepositories({
          sort: 'updated',
          per_page: 100,
          searchQuery
        });
        return response;
      });

      if (results) {
        console.log('[Step 2 Success] Found repositories:', results.length);
        setSearchResults(results);
        setShowSearchDropdown(true);
      }
    } catch (error: any) {
      console.error('[Step 2 Error] Error searching repositories:', error);
      toast({
        title: 'Search Error',
        description: 'Unable to search repositories. Please try again.',
        variant: 'destructive'
      });
    }
  }, [user, withGitHub, searchQuery, setSearchResults, setShowSearchDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleRepositorySelect = (repo: Repository) => {
    setSelectedRepo(repo);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleTrackRepository = async (repo: Repository) => {
    try {
      console.log('[Step 3] Checking repository access:', { owner: repo.owner.login, name: repo.name });
      // Check if we have access and get permissions
      const access = await withGitHub((client) =>
        client.checkRepositoryAccess(repo.owner.login, repo.name)
      );

      if (!access?.hasAccess) {
        console.log('[Step 3 Failed] No access to repository');
        toast({
          title: 'Access Error',
          description: 'You no longer have access to this repository.',
          variant: 'destructive'
        });
        return;
      }

      console.log('[Step 3 Success] Repository access confirmed, adding to tracking');
      // Add repository to tracking
      const { error } = await supabase
        .from('repositories')
        .upsert({
          github_id: repo.id,
          name: repo.name,
          owner: repo.owner.login,
          repository_permissions: access.permissions,
          last_analysis_timestamp: null,
          analyzed_by_user_id: null,
          is_public: !access.isPrivate
        });

      if (error) throw error;

      console.log('[Step 3 Complete] Repository added to tracking');
      toast({
        title: 'Repository Added',
        description: `Now tracking ${repo.owner.login}/${repo.name}`,
      });

      setSelectedRepo(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('[Step 3 Error] Error tracking repository:', error);
      toast({
        title: 'Error',
        description: 'Failed to track repository. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAnalyzeRepository = async (repo: Repository) => {
    setSelectedRepo(null);
    navigate(`/analyze/${repo.owner.login}/${repo.name}`);
  };

  const handleRepoClick = async (owner: string, name: string) => {
    try {
      console.log('[Step 1] Fetching repository ID from Supabase:', { owner, name });
      // Then try to get the repository ID
      const { data: repoData } = await supabase
        .from('repositories')
        .select('id')
        .eq('owner', owner)
        .eq('name', name)
        .single();

      if (!repoData?.id) {
        console.log('[Step 1 Failed] Repository not found in database');
        toast({
          title: 'Repository Not Found',
          description: 'This repository is no longer being tracked. Try searching for it again.',
          variant: 'destructive'
        });
        return;
      }

      console.log('[Step 1 Success] Found repository ID:', repoData.id);
      // Only set the view state if we successfully found the repository
      setSelectedAnalysisRepo({ owner, name, id: repoData.id });
      setIsAnalysisView(true);
    } catch (error) {
      console.error('[Step 1 Error] Error getting repository:', error);
      toast({
        title: 'Error',
        description: 'Unable to load repository details. Please try again.',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery, handleSearch]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  // Reset animation states when view changes
  useEffect(() => {
    setIsAnimating(false);
    setShowSidebar(false);
    setShowStats(false);
  }, [isAnalysisView]);

  // Control animation sequence
  useEffect(() => {
    if (isAnalysisView) {
      // Wait for GlobalStatsCard movement to complete
      const sidebarTimer = setTimeout(() => {
        setShowSidebar(true);
        // Wait for sidebar fade-in
        const statsTimer = setTimeout(() => {
          setShowStats(true);
          // Wait for stats fade-in
          const contentTimer = setTimeout(() => {
            setIsAnimating(true);
          }, 300); // Stats fade duration
          return () => clearTimeout(contentTimer);
        }, 300); // Sidebar fade duration
        return () => clearTimeout(statsTimer);
      }, 200); // GlobalStatsCard movement duration
      return () => clearTimeout(sidebarTimer);
    }
  }, [isAnalysisView]);

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: theme.colors.background.primary }}>
      {/* Top Navigation Bar */}
      <header className="w-full border-b" style={{
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary
      }}>
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center min-w-[240px]">
            <HeaderLogo />
          </div>
          {/* Global Search Bar */}
          <div className="flex-1 flex justify-center px-4" ref={searchRef}>
            <div className="relative w-[600px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: theme.colors.text.secondary }} />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg pl-10 pr-4 py-2 text-sm"
                style={{
                  backgroundColor: theme.colors.background.primary,
                  color: theme.colors.text.primary,
                  borderColor: theme.colors.border.primary
                }}
              />
              {githubLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="h-4 w-4 animate-spin" style={{ color: theme.colors.text.secondary }} />
                </div>
              )}
              <SearchResultsDropdown
                results={searchResults}
                isLoading={githubLoading}
                onSelect={handleRepositorySelect}
                show={showSearchDropdown}
              />
            </div>
          </div>

          {/* Profile Section */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 rounded-full p-2 transition-colors hover:opacity-80"
              style={{ color: theme.colors.text.primary }}
            >
              <img
                src={avatarUrl}
                alt={firstName}
                className="h-8 w-8 rounded-full"
              />
              <span className="text-sm">Hey {firstName}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-lg border py-1"
                style={{
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.primary
                }}
              >
                <div className="px-4 py-2 text-sm" style={{ color: theme.colors.text.secondary }}>
                  Signed in as <br />
                  <strong style={{ color: theme.colors.text.primary }}>{firstName}</strong>
                </div>
                <div className="border-t my-1" style={{ borderColor: theme.colors.border.primary }} />
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm transition-colors flex items-center hover:bg-gray-500/10"
                  style={{ color: theme.colors.text.primary }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-[300px] border-r overflow-y-auto"
          style={{
            backgroundColor: theme.colors.background.primary,
            borderColor: theme.colors.border.primary
          }}
        >
          {/* Recently Tracked Section */}
          <div className="pt-6 px-3">
            <h2 className="text-sm font-medium mb-2" style={{ color: theme.colors.text.primary }}>
              Recently Tracked
            </h2>
            <nav className="space-y-1">
              {recentLoading ? (
                <div className="flex items-center justify-center py-2">
                  <RefreshCw className="h-4 w-4 animate-spin" style={{ color: theme.colors.text.secondary }} />
                </div>
              ) : recentlyTracked.length > 0 ? (
                recentlyTracked.map((repo) => (
                  <Tooltip key={repo.id} content={`${repo.owner}/${repo.name}`}>
                    <div
                      onClick={() => handleRepoClick(repo.owner, repo.name)}
                      className="mx-3 flex items-center py-2 rounded-lg transition-colors hover:bg-gray-500/10 cursor-pointer"
                      style={{ color: theme.colors.text.primary }}
                    >
                      <GitFork className="h-4 w-4 min-w-[16px] ml-3 mr-2" />
                      <span className="text-sm truncate">{repo.owner}/{repo.name}</span>
                    </div>
                  </Tooltip>
                ))
              ) : (
                <div className="px-3 py-2 text-sm" style={{ color: theme.colors.text.secondary }}>
                  No repositories tracked yet
                </div>
              )}
            </nav>
          </div>

          {/* Recently Analyzed Section */}
          <div className="p-3">
            <h2 className="text-sm font-medium mb-2" style={{ color: theme.colors.text.primary }}>
              Recently Analyzed
            </h2>
            <nav className="space-y-1">
              {recentLoading ? (
                <div className="flex items-center justify-center py-2">
                  <RefreshCw className="h-4 w-4 animate-spin" style={{ color: theme.colors.text.secondary }} />
                </div>
              ) : recentlyAnalyzed.length > 0 ? (
                recentlyAnalyzed.map((repo) => (
                  <Tooltip key={repo.id} content={`${repo.owner}/${repo.name}`}>
                    <div
                      onClick={() => handleRepoClick(repo.owner, repo.name)}
                      className="mx-3 flex items-center py-2 rounded-lg transition-colors hover:bg-gray-500/10 cursor-pointer"
                      style={{ color: theme.colors.text.primary }}
                    >
                      <GitFork className="h-4 w-4 min-w-[16px] ml-3 mr-2" />
                      <span className="text-sm truncate">{repo.owner}/{repo.name}</span>
                    </div>
                  </Tooltip>
                ))
              ) : (
                <div className="px-3 py-2 text-sm" style={{ color: theme.colors.text.secondary }}>
                  No repositories analyzed yet
                </div>
              )}
            </nav>
          </div>
        </aside>

        {/* Main content with animation */}
        <AnimatePresence>
          <motion.div
            className="flex-1 flex relative"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Analysis View Content */}
            {isAnalysisView && selectedAnalysisRepo && (
              <div className="flex-1 relative">
                <motion.div
                  className="absolute inset-0 overflow-y-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isAnimating ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h1 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
                        {selectedAnalysisRepo.owner}/{selectedAnalysisRepo.name}
                      </h1>
                      <button
                        onClick={() => setIsAnalysisView(false)}
                        className="text-sm hover:opacity-80"
                        style={{ color: theme.colors.text.secondary }}
                      >
                        ← Back to Dashboard
                      </button>
                    </div>
                    <IssueProcessor
                      repositoryId={selectedAnalysisRepo.id!}
                      owner={selectedAnalysisRepo.owner}
                      name={selectedAnalysisRepo.name}
                    />
                  </div>
                </motion.div>
              </div>
            )}

            {/* Right sidebar */}
            {isAnalysisView && (
              <motion.div
                className="w-[300px] border-l"
                initial={{ opacity: 0 }}
                animate={{ opacity: showSidebar ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  borderColor: theme.colors.border.primary,
                  backgroundColor: theme.colors.background.primary
                }}
              >
                {/* Repository Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: showStats ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-4">
                    <h2 className="text-sm font-medium mb-4" style={{ color: theme.colors.text.primary }}>
                      Repository Stats
                    </h2>
                    <div className="flex items-center mb-4">
                      <GitFork className="h-4 w-4 mr-2" style={{ color: theme.colors.text.secondary }} />
                      <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                        {selectedAnalysisRepo?.owner}/{selectedAnalysisRepo?.name}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: theme.colors.text.secondary }}>Last Analysis</span>
                        <span className="text-sm" style={{ color: theme.colors.text.primary }}>Never</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: theme.colors.text.secondary }}>Issues Found</span>
                        <span className="text-sm" style={{ color: theme.colors.text.primary }}>0</span>
                      </div>
                    </div>
                  </div>

                  {/* Start Analysis Button */}
                  <div className="px-4 pb-4">
                    <button
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 transition-colors"
                      style={{ color: theme.colors.text.primary }}
                    >
                      Start Analysis
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Stat Cards Container */}
            <motion.div
              key={isAnalysisView ? 'analysis' : 'dashboard'}
              className={`${isAnalysisView ? 'absolute right-0 w-[300px] top-[208px]' : 'p-6 w-full'}`}
              layout
              transition={{
                layout: {
                  duration: 0.2,
                  ease: "easeInOut"
                }
              }}
            >
              <div className={isAnalysisView ? 'px-4 space-y-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}>
                <GlobalStatsCard
                  layoutId="stat-card-openIssues"
                  id="openIssues"
                  title="Open Issues"
                  value={stats?.openIssues?.toString() || '0'}
                  description="Across all tracked repositories"
                  icon={GitPullRequest}
                  onRefresh={onRefreshStats?.openIssues}
                  refreshing={stats?.refreshing?.openIssues}
                  variant={isAnalysisView ? 'compact' : 'default'}
                />
                <GlobalStatsCard
                  layoutId="stat-card-trackedRepos"
                  id="trackedRepos"
                  title="Tracked Repos"
                  value={stats?.trackedRepos?.toString() || '0'}
                  description="Being monitored"
                  icon={Star}
                  onRefresh={onRefreshStats?.trackedRepos}
                  refreshing={stats?.refreshing?.trackedRepos}
                  variant={isAnalysisView ? 'compact' : 'default'}
                />
                <GlobalStatsCard
                  layoutId="stat-card-analyzedRepos"
                  id="analyzedRepos"
                  title="Analyzed Repos"
                  value={stats?.analyzedRepos?.toString() || '0'}
                  description="In the last 30 days"
                  icon={Search}
                  onRefresh={onRefreshStats?.analyzedRepos}
                  refreshing={stats?.refreshing?.analyzedRepos}
                  variant={isAnalysisView ? 'compact' : 'default'}
                />
                <GlobalStatsCard
                  layoutId="stat-card-activeAutomations"
                  id="activeAutomations"
                  title="Active Automations"
                  value={stats?.activeAutomations?.toString() || '0'}
                  description="Currently running"
                  icon={Settings}
                  onRefresh={onRefreshStats?.activeAutomations}
                  refreshing={stats?.refreshing?.activeAutomations}
                  variant={isAnalysisView ? 'compact' : 'default'}
                />
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Modal */}
      <RepositoryActionModal
        repository={selectedRepo}
        onClose={() => setSelectedRepo(null)}
        onTrack={handleTrackRepository}
        onAnalyze={handleAnalyzeRepository}
      />
    </div>
  );
}