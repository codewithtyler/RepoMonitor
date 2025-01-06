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

  const handleGitHubError = useCallback((error: Error & { status?: number }) => {
    // Auth specific errors
    if (error.message === 'TOKEN_EXPIRED' || error.status === 401) {
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    // Permission errors
    if (error.status === 403 || error.message.includes('permission')) {
      toast({
        title: 'Permission Denied',
        description: 'You don\'t have permission to perform this action.',
        variant: 'destructive'
      });
      return;
    }

    // Rate limit errors
    if (error.message.includes('rate limit')) {
      toast({
        title: 'Rate Limit Exceeded',
        description: 'Please wait a few minutes and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Bad request errors (400)
    if (error.status === 400) {
      toast({
        title: 'Invalid Request',
        description: 'Unable to process this request. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    // Not found errors (404)
    if (error.status === 404) {
      toast({
        title: 'Not Found',
        description: 'The requested resource was not found.',
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
      console.log('[GitHub Client] Operation aborted: No user found');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to continue.',
        variant: 'destructive'
      });
      return null;
    }

    setLoading(true);
    try {
      console.log('[GitHub Client] Getting GitHub client for user:', user.id);
      const client = await getGitHubClient(user.id);
      console.log('[GitHub Client] Successfully got client, executing operation');
      const result = await operation(client);
      console.log('[GitHub Client] Operation completed successfully');
      return result;
    } catch (error) {
      console.error('[GitHub Client] Operation failed:', error);
      handleGitHubError(error as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, handleGitHubError]);

  return {
    loading,
    withGitHub
  };
}