import { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/auth/supabase-client';
import { useUser } from '@/lib/auth/hooks';
import { logger } from '@/lib/utils/logger';
import { GitHubTokenManager } from '@/lib/auth/github-token-manager';

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
};

const defaultContext: AuthContextType = {
    user: null,
    loading: false,
    signIn: async () => { },
    signOut: async () => { },
    signUp: async () => { }
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();

    const signUp = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
        } catch (error) {
            logger.error('[AuthProvider] Sign up error:', error);
            throw error;
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (error) {
            logger.error('[AuthProvider] Sign in error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            // Clear all GitHub tokens first
            GitHubTokenManager.clearAllTokens();

            // Clear any other app state
            localStorage.removeItem('trackedRepositories');
            localStorage.removeItem('totalRepositories');

            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // Force reload the page to clear all in-memory state
            window.location.href = '/';
        } catch (error) {
            logger.error('[AuthProvider] Sign out error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context as AuthContextType;
}
