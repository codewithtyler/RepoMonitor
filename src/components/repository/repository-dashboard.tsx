import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositoriesData, type Repository } from '@/lib/hooks/use-repository-data';
import { RepositoryList } from '@/components/repository/repository-list';
import { SearchBar } from '@/components/search/search-bar';
import { theme } from '@/config/theme';

export function RepositoryDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: repositories, isLoading, error } = useRepositoriesData();

  const filteredRepositories = repositories?.filter(repo => {
    const searchLower = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(searchLower) ||
      repo.owner.toLowerCase().includes(searchLower) ||
      (repo.description?.toLowerCase() || '').includes(searchLower)
    );
  });

  const handleRepositorySelect = (repository: Repository) => {
    navigate(`/analyze/${repository.owner}/${repository.name}`);
  };

  if (isLoading) {
    return (
      <div className="p-4" style={{ color: theme.colors.text.primary }}>
        Loading repositories...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4" style={{ color: theme.colors.error.primary }}>
        Error loading repositories: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
          Your Repositories
        </h2>
      </div>

      <SearchBar
        placeholder="Search repositories..."
        value={searchQuery}
        onChange={setSearchQuery}
        autoFocus
      />

      <RepositoryList
        repositories={filteredRepositories || []}
        onSelect={handleRepositorySelect}
      />
    </div>
  );
}
