-- Create GitHub tokens table
CREATE TABLE github_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    last_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_github_token() RETURNS trigger AS $$
BEGIN
    -- Use pgcrypto to encrypt the token
    IF NEW.token IS NOT NULL THEN
        NEW.token = encode(
            encrypt_iv(
                NEW.token::bytea,
                decode(current_setting('pgsodium.key_b64')::text, 'base64'),
                decode('000102030405060708090a0b0c0d0e0f', 'hex')  -- Static IV for deterministic encryption
            ),
            'hex'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt token
CREATE OR REPLACE FUNCTION decrypt_github_token(encrypted_token TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(
        decrypt_iv(
            decode(encrypted_token, 'hex'),
            decode(current_setting('pgsodium.key_b64')::text, 'base64'),
            decode('000102030405060708090a0b0c0d0e0f', 'hex')  -- Same static IV
        ),
        'utf8'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to encrypt token on insert/update
CREATE TRIGGER encrypt_github_token_trigger
    BEFORE INSERT OR UPDATE OF token ON github_tokens
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_github_token();

-- Enable RLS
ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own tokens
CREATE POLICY github_tokens_policy ON github_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id); 