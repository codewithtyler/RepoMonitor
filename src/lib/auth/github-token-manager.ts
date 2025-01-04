import { supabase } from './supabase-client';

// In-memory token storage
let currentToken: string | null = null;

export class GitHubTokenManager {
    static async handleOAuthToken(token: string, userId: string): Promise<string> {
        // Clean and validate using the working logic from callback.tsx
        const cleanToken = token.trim().replace(/\s+/g, '');
        if (!cleanToken.startsWith('gho_')) {
            throw new Error('Invalid token format: must start with gho_');
        }

        // Store in memory
        currentToken = cleanToken;

        // Store in database using the working logic from callback.tsx
        const { error: updateError } = await supabase
            .from('github_tokens')
            .upsert({
                user_id: userId,
                token: cleanToken,
                expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
                scopes: ['repo', 'public_repo'],
                last_refresh: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (updateError) {
            throw new Error('Failed to store GitHub token');
        }

        return cleanToken;
    }

    static async getToken(userId: string): Promise<string> {
        // Try memory first
        if (currentToken) {
            return currentToken;
        }

        // If not in memory, get from database
        const { data: tokenData, error } = await supabase
            .from('github_tokens')
            .select('token, expires_at')
            .eq('user_id', userId)
            .single();

        if (error || !tokenData?.token) {
            throw new Error('Failed to get GitHub token');
        }

        // Decrypt token
        const { data: decryptedToken, error: decryptError } = await supabase
            .rpc('decrypt_github_token', { encrypted_token: tokenData.token });

        if (decryptError || !decryptedToken) {
            throw new Error('Failed to decrypt GitHub token');
        }

        // Clean and validate
        const cleanToken = String(decryptedToken).trim();
        if (!cleanToken.startsWith('gho_')) {
            throw new Error('Invalid token format after decryption');
        }

        // Store in memory
        currentToken = cleanToken;

        return cleanToken;
    }

    static clearToken() {
        currentToken = null;
    }
}