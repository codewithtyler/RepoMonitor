import { Github } from 'lucide-react';
import { supabase } from '@/lib/auth/supabase-client';
import { logger } from '@/lib/utils/logger';

interface GitHubLoginButtonProps {
    returnTo?: string | null;
}

export function GitHubLoginButton({ returnTo }: GitHubLoginButtonProps) {
    const handleGitHubSignIn = async () => {
        try {
            logger.debug('[GitHubLoginButton] Starting GitHub sign in');

            // Build the callback URL with the return path
            const callbackUrl = new URL('/auth/callback', window.location.origin);
            if (returnTo) {
                callbackUrl.searchParams.set('returnTo', returnTo);
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: callbackUrl.toString(),
                    scopes: 'repo read:user user:email',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                        response_type: 'code',
                    },
                    skipBrowserRedirect: false,
                }
            });

            if (error) {
                logger.error('[GitHubLoginButton] Error signing in:', error);
                throw error;
            }

            logger.debug('[GitHubLoginButton] Sign in initiated:', data);
        } catch (error) {
            logger.error('[GitHubLoginButton] Error:', error);
            // Let the error propagate to be handled by the error boundary
            throw error;
        }
    };

    return (
        <button
            onClick={handleGitHubSignIn}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-[#2ea043] hover:bg-[#2c974b] focus:outline-none focus:ring-2 focus:ring-[#2ea043] text-[#ffffff] text-sm font-semibold rounded-lg transition-colors duration-200 min-w-[200px]`}
        >
            <Github className="h-5 w-5" />
            Sign in with GitHub
        </button>
    );
}
