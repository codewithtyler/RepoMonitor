-- Drop existing policy
DROP POLICY IF EXISTS github_tokens_policy ON github_tokens;

-- Create new policy that allows users to read and write their own tokens
CREATE POLICY github_tokens_policy ON github_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant execute permission on decrypt_github_token function
GRANT EXECUTE ON FUNCTION decrypt_github_token TO authenticated;

-- Grant execute permission on encrypt_github_token function
GRANT EXECUTE ON FUNCTION encrypt_github_token TO authenticated;
