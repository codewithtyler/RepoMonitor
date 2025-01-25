import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase-client';

export interface AuthState {
    session: Session | null;
    user: User | null;
    loading: boolean;
}

let state: AuthState = {
    session: null,
    user: null,
    loading: true
};

export async function getAuthState(): Promise<AuthState> {
    if (state.loading) {
        const { data } = await supabase.auth.getSession();
        state = {
            session: data.session,
            user: data.session?.user ?? null,
            loading: false
        };
    }
    return state;
}

export function subscribeToAuth(callback: (state: AuthState) => void) {
    // Initial state
    callback(state);

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        state = {
            session,
            user: session?.user ?? null,
            loading: false
        };
        callback(state);
    });

    return () => subscription.unsubscribe();
}
