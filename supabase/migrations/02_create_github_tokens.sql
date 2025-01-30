-- Create the github_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.github_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_github_tokens_updated_at ON github_tokens;
CREATE TRIGGER update_github_tokens_updated_at
    BEFORE UPDATE ON github_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.github_tokens TO authenticated;
GRANT ALL ON public.github_tokens TO service_role;

-- Enable RLS
ALTER TABLE public.github_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS github_tokens_select_policy ON github_tokens;
CREATE POLICY github_tokens_select_policy ON github_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS github_tokens_insert_policy ON github_tokens;
CREATE POLICY github_tokens_insert_policy ON github_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS github_tokens_update_policy ON github_tokens;
CREATE POLICY github_tokens_update_policy ON github_tokens
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS github_tokens_delete_policy ON github_tokens;
CREATE POLICY github_tokens_delete_policy ON github_tokens
    FOR DELETE
    USING (auth.uid() = user_id);
