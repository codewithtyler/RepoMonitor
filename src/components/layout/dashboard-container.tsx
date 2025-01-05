import * as React from 'react';
import { HeaderLogo } from './header-logo';
import { theme } from '../../config/theme';
import { useUser } from '../../lib/auth/hooks';
import { ChevronDown, LogOut, GitFork, Search, RefreshCw } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/auth/supabase-client';
import { useNavigate, Link } from 'react-router-dom';
import { useGitHub } from '@/lib/hooks/use-github';
import { useSearch } from '@/lib/contexts/search-context';
import { SearchResultsDropdown } from '../search/search-results-dropdown';
import { RepositoryActionModal } from '../search/repository-action-modal';
import { toast } from '../../hooks/use-toast';
import { useRecentRepositories } from '@/lib/hooks/use-recent-repositories';

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

export function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  const handleSearch = useCallback(async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      const results = await withGitHub(async (client) => {
        const response = await client.listUserRepositories({
          sort: 'updated',
          per_page: 100,
          searchQuery
        });
        return response;
      });

      if (results) {
        setSearchResults(results);
        setShowSearchDropdown(true);
      }
    } catch (error: any) {
      console.error('Error searching repositories:', error);
      if (error?.status === 401) {
        navigate('/');
      }
    }
  }, [user, navigate, withGitHub, searchQuery, setSearchResults, setShowSearchDropdown]);

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
      // Check if we have access and get permissions
      const access = await withGitHub((client) =>
        client.checkRepositoryAccess(repo.owner.login, repo.name)
      );

      if (!access?.hasAccess) {
        toast({
          title: 'Access Error',
          description: 'You no longer have access to this repository.',
          variant: 'destructive'
        });
        return;
      }

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

      toast({
        title: 'Repository Added',
        description: `Now tracking ${repo.owner.login}/${repo.name}`,
      });

      setSelectedRepo(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error tracking repository:', error);
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
        <aside className="w-64 border-r overflow-y-auto" style={{
          backgroundColor: theme.colors.background.primary,
          borderColor: theme.colors.border.primary
        }}>
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
                  <Link
                    key={repo.id}
                    to={`/tracked/${repo.owner}/${repo.name}`}
                    className="flex items-center px-3 py-2 rounded-lg transition-colors hover:bg-gray-500/10"
                    style={{ color: theme.colors.text.primary }}
                  >
                    <GitFork className="h-4 w-4 mr-2" />
                    <span className="text-sm truncate">{repo.owner}/{repo.name}</span>
                  </Link>
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
                  <Link
                    key={repo.id}
                    to={`/analyze/${repo.owner}/${repo.name}`}
                    className="flex items-center px-3 py-2 rounded-lg transition-colors hover:bg-gray-500/10"
                    style={{ color: theme.colors.text.primary }}
                  >
                    <GitFork className="h-4 w-4 mr-2" />
                    <span className="text-sm truncate">{repo.owner}/{repo.name}</span>
                  </Link>
                ))
              ) : (
                <div className="px-3 py-2 text-sm" style={{ color: theme.colors.text.secondary }}>
                  No repositories analyzed yet
                </div>
              )}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
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