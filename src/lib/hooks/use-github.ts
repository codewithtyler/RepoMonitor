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
    console.log('[handleGitHubError] Handling error:', {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack
    });

    if (error.message === 'TOKEN_EXPIRED') {
      console.log('[handleGitHubError] Token expired, redirecting to auth');
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    if (error.message === 'Failed to get GitHub token') {
      console.log('[handleGitHubError] No token found, redirecting to auth');
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
      console.log('[handleGitHubError] Rate limit exceeded');
      toast({
        title: 'Rate Limit Exceeded',
        description: 'Please wait a few minutes and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Handle permission errors
    if (error.message.includes('permission') || error.message.includes('403')) {
      console.log('[handleGitHubError] Permission denied');
      toast({
        title: 'Permission Denied',
        description: 'You don\'t have permission to perform this action.',
        variant: 'destructive'
      });
      return;
    }

    // Generic error
    console.log('[handleGitHubError] Unhandled error');
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive'
    });
  }, [navigate]);

  const withGitHub = useCallback(async <T>(operation: (client: GitHubClient) => Promise<T>): Promise<T | null> => {
    console.log('[withGitHub] Starting operation with user:', user?.id);
    if (!user) {
      console.log('[withGitHub] No user found, redirecting to auth');
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
      console.log('[withGitHub] Getting GitHub client for user:', user.id);
      const client = await getGitHubClient(user.id);
      console.log('[withGitHub] Got client, executing operation');
      return await operation(client);
    } catch (error) {
      console.log('[withGitHub] Operation failed:', error);
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