/**
 * Validates the authentication configuration from environment variables
 */
export function validateAuthConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (process.env.NODE_ENV === 'development' && (!url || !key)) {
        console.warn(
            'Warning: Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env'
        );
    }

    return { url, key };
}