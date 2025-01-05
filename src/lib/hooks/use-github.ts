import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGitHubClient } from '../github';
import type { GitHubClient } from '@/lib/github';
import { useUser } from '../auth/hooks';
import { toast } from '../../hooks/use-toast';

export function useGitHub() {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  const handleGitHubError = useCallback((error: Error) => {
    if (error.message === 'TOKEN_EXPIRED') {
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    if (error.message === 'Failed to get GitHub token') {
      toast({
        title: 'Authentication Error',
        description: 'Please sign in again to continue.',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    // Handle rate limit errors
    if (error.message.includes('rate limit')) {
      toast({
        title: 'Rate Limit Exceeded',
        description: 'Please wait a few minutes and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Handle permission errors
    if (error.message.includes('permission') || error.message.includes('403')) {
      toast({
        title: 'Permission Denied',
        description: 'You don\'t have permission to perform this action.',
        variant: 'destructive'
      });
      return;
    }

    // Generic error
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive'
    });
  }, [navigate]);

  const withGitHub = useCallback(async <T>(operation: (client: GitHubClient) => Promise<T>): Promise<T | null> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to continue.',
        variant: 'destructive'
      });
      navigate('/auth');
      return null;
    }

    setLoading(true);
    try {
      const client = await getGitHubClient(user.id);
      return await operation(client);
    } catch (error) {
      handleGitHubError(error as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, handleGitHubError, navigate]);

  return {
    loading,
    withGitHub
  };
}