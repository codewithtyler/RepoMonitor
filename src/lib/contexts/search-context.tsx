import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/auth/supabase-client'
import { useGitHub } from '@/lib/hooks/use-github'
import { addRepository } from '@/lib/hooks/use-repository-data'

interface SearchContextType {
  handleRepositorySelect: (owner: string, name: string) => Promise<void>
  isLoading: boolean
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

// Named export for the provider component
export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const { withGitHub } = useGitHub()

  const handleRepositorySelect = async (owner: string, name: string) => {
    try {
      setIsLoading(true)
      console.log('Selecting repository:', { owner, name });

      // First, try to get the repository from GitHub to ensure it exists
      const repository = await withGitHub(async (client) => {
        return await client.getRepository(owner, name);
      });

      if (!repository) {
        throw new Error('Repository not found on GitHub');
      }

      // Check if repository already exists in our database
      const { data: existingRepos, error: queryError } = await supabase
        .from('repositories')
        .select('id, github_id')
        .eq('owner', owner)
        .eq('name', name);

      if (queryError) {
        console.error('Database query error:', queryError);
        throw queryError;
      }

      if (existingRepos && existingRepos.length > 0) {
        console.log('Repository exists in database:', existingRepos[0]);
        // If repository exists, navigate to dashboard with repository selected
        navigate('/dashboard', {
          state: {
            selectedRepository: { owner, name },
            shouldStartAnalysis: false
          }
        });
      } else {
        console.log('Adding new repository to database:', repository);
        // If repository doesn't exist, add it using the GitHub client
        await withGitHub(async (client) => {
          await addRepository(owner, name, client);
        });

        // Successfully added repository, navigate to dashboard and start analysis
        navigate('/dashboard', {
          state: {
            selectedRepository: { owner, name },
            shouldStartAnalysis: true
          }
        });
      }
    } catch (error) {
      console.error('Error selecting repository:', error);
      toast({
        title: 'Error',
        description: error instanceof Error
          ? error.message
          : 'Failed to select repository. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SearchContext.Provider value={{ handleRepositorySelect, isLoading }}>
      {children}
    </SearchContext.Provider>
  );
}

// Named export for the hook
export const useSearch = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
