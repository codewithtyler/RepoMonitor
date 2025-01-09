import { Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { theme } from '@/config/theme';
import { useSearch } from '@/lib/contexts/search-context';
import { SearchResultsDropdown } from './search-results-dropdown';
import { useGitHub } from '@/lib/hooks/use-github';
import { toast } from 'sonner';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

export function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { withGitHub } = useGitHub();
  const { searchQuery, setSearchQuery, triggerSearch } = useSearch();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    setIsOpen(true);

    try {
      const searchResults = await withGitHub(async (client) => {
        return client.listUserRepositories({
          searchQuery: query,
          per_page: 10
        });
      });

      setResults(searchResults || []);
    } catch (error) {
      console.error('Search error:', error);
      if (error instanceof Error &&
        error.message.includes('rate limit') ||
        (error as any).status === 403) {
        toast.error('Rate Limit Exceeded', {
          description: 'You have exceeded GitHub API rate limits. Please try again in an hour.'
        });
      } else {
        toast.error('Search Failed', {
          description: 'Failed to search repositories. Please try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (repo: any) => {
    setIsOpen(false);
    setSearchQuery('');
    window.location.href = `/repository/${repo.owner.login}/${repo.name}`;
  };

  return (
    <div className="relative flex-1 max-w-md mx-auto" ref={searchRef}>
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: theme.colors.text.secondary }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search repositories..."
          className="w-full h-8 pl-9 pr-3 rounded-md border text-sm"
          style={{
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.primary,
            color: theme.colors.text.primary
          }}
        />
      </div>
      <SearchResultsDropdown
        results={results}
        isLoading={isLoading}
        onSelect={handleSelect}
        show={isOpen}
      />
    </div>
  );
}
