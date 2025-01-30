import { createContext, useContext, useCallback } from 'react';
import { getGitHubClient } from '@/lib/github';
import { getAuthState } from '@/lib/auth/global-state';
import type { GitHubClient } from '@/lib/github';

export interface GitHubContextType {
    client: GitHubClient | null;
    withGitHub: <T>(fn: (client: GitHubClient) => Promise<T>) => Promise<T>;
}

const GitHubContext = createContext<GitHubContextType>({
    client: null,
    withGitHub: async () => {
        throw new Error('useGitHub must be used within a GitHubProvider');
    }
});

export function GitHubProvider({ children }: { children: React.ReactNode }) {
    const withGitHub = useCallback(async <T,>(fn: (client: GitHubClient) => Promise<T>): Promise<T> => {
        const state = await getAuthState();
        if (!state.user) {
            throw new Error('User must be authenticated to use GitHub client');
        }
        const client = await getGitHubClient(state.user.id);
        return fn(client);
    }, []);

    return (
        <GitHubContext.Provider value={{ withGitHub }}>
            {children}
        </GitHubContext.Provider>
    );
}

export function useGitHub() {
    const context = useContext(GitHubContext);
    if (!context) {
        throw new Error('useGitHub must be used within a GitHubProvider');
    }
    return context;
}

