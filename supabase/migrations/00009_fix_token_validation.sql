-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS encrypt_github_token_trigger ON github_tokens;
DROP FUNCTION IF EXISTS encrypt_github_token();
DROP FUNCTION IF EXISTS decrypt_github_token(TEXT);

-- Update existing tokens to be unencrypted (if any exist)
UPDATE github_tokens SET token = NULL;

-- Add a comment to indicate encryption is disabled
COMMENT ON TABLE github_tokens IS 'GitHub tokens are stored without encryption. Token validation is handled at the application level.';

-- Ensure RLS is still enabled
ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

-- Recreate the policy to ensure it's correct
DROP POLICY IF EXISTS github_tokens_policy ON github_tokens;
CREATE POLICY github_tokens_policy ON github_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
