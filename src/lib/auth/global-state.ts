import { User } from '@supabase/supabase-js';
import { supabase } from './supabase-client';

interface AuthState {
    user: User | null;
    loading: boolean;
}

let state: AuthState = {
    user: null,
    loading: typeof window === 'undefined' ? false : true // Don't show loading state during SSR
};

const subscribers = new Set<(state: AuthState) => void>();
let initializationPromise: Promise<void> | null = null;

function notifySubscribers() {
    if (typeof window === 'undefined') return; // Don't notify during SSR
    subscribers.forEach(callback => callback(state));
}

// Initialize the auth state only once
async function initializeAuthState() {
    if (typeof window === 'undefined') return null; // Skip during SSR

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            console.log('[AuthState] Initializing auth state');
            const { data: { session } } = await supabase.auth.getSession();
            state = {
                user: session?.user ?? null,
                loading: false
            };
            console.log('[AuthState] Auth state initialized:', {
                hasUser: !!state.user,
                userId: state.user?.id
            });
            notifySubscribers();
        } catch (error) {
            console.error('[AuthState] Failed to initialize auth state:', error);
            state = {
                user: null,
                loading: false
            };
            notifySubscribers();
        }
    })();

    return initializationPromise;
}

// Initialize on client side only
if (typeof window !== 'undefined') {
    initializeAuthState();

    // Keep state in sync with a single listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[AuthState] Auth state changed:', {
            event: _event,
            hasUser: !!session?.user,
            userId: session?.user?.id
        });
        state = {
            user: session?.user ?? null,
            loading: false
        };
        notifySubscribers();
    });
}

// Cleanup function for tests/development
export function cleanup() {
    if (typeof window === 'undefined') return; // Skip during SSR

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { });
    subscription.unsubscribe();
    subscribers.clear();
    state = {
        user: null,
        loading: true
    };
    initializationPromise = null;
}

export function getAuthState(): AuthState {
    if (typeof window === 'undefined') {
        return { user: null, loading: false }; // Return empty state during SSR
    }

    if (state.loading && !initializationPromise) {
        initializeAuthState();
    }
    return state;
}

export function subscribeToAuth(callback: (state: AuthState) => void): () => void {
    if (typeof window === 'undefined') {
        return () => { }; // No-op during SSR
    }

    if (state.loading && !initializationPromise) {
        initializeAuthState();
    }

    subscribers.add(callback);
    callback(state); // Initial state

    return () => {
        subscribers.delete(callback);
    };
}
