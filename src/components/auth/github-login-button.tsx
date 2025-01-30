import { Github } from 'lucide-react';
import { supabase } from '@/lib/auth/supabase-client';
import { logger } from '@/lib/utils/logger';

export function GitHubLoginButton() {
    const handleGitHubSignIn = async () => {
        try {
            logger.debug('[GitHubLoginButton] Starting GitHub sign in');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    scopes: 'repo read:user user:email',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-[#ffffff] text-sm font-semibold rounded-md transition-colors duration-200 min-w-[200px]"
        >
            <Github className="h-5 w-5" />
            Sign in with GitHub
        </button>
    );
}
