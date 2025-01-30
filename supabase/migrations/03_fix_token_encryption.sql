-- Enable pgsodium extension
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Clear existing tokens since we're having encryption issues
TRUNCATE TABLE github_tokens;

-- Create a key for the new encryption
DO $$
DECLARE
    encryption_key_id uuid;
BEGIN
    -- Drop existing key if it exists
    DELETE FROM pgsodium.key WHERE name = 'github_token_key_v1';

    -- Create a new key
    SELECT id INTO encryption_key_id
    FROM pgsodium.create_key(
        name => 'github_token_key_v1',
        raw_key => pgsodium.crypto_aead_det_keygen(),
        key_context => 'github_token',
        key_type => 'aead-det'
    );

    -- Create the encryption function
    EXECUTE
        'CREATE OR REPLACE FUNCTION encrypt_github_token() RETURNS trigger AS $body$
        BEGIN
            IF NEW.token IS NOT NULL THEN
                -- Store the token format for validation
                IF LENGTH(NEW.token) < 40 THEN
                    RAISE EXCEPTION ''Invalid token format: must be at least 40 characters'';
                END IF;

                NEW.token = encode(
                    pgsodium.crypto_aead_det_encrypt(
                        convert_to(NEW.token, ''utf8''),
                        convert_to(''github_token'', ''utf8''),
                        ''' || encryption_key_id || '''::uuid
                    ),
                    ''base64''
                );
            END IF;
            RETURN NEW;
        END;
        $body$ LANGUAGE plpgsql SECURITY DEFINER';

    -- Create the decryption function
    EXECUTE
        'CREATE OR REPLACE FUNCTION decrypt_github_token(encrypted_token TEXT)
        RETURNS TEXT AS $body$
        DECLARE
            decrypted TEXT;
        BEGIN
            decrypted := convert_from(
                pgsodium.crypto_aead_det_decrypt(
                    decode(encrypted_token, ''base64''),
                    convert_to(''github_token'', ''utf8''),
                    ''' || encryption_key_id || '''::uuid
                ),
                ''utf8''
            );

            -- Validate decrypted token format
            IF LENGTH(decrypted) < 40 THEN
                RAISE EXCEPTION ''Decrypted token has invalid format: must be at least 40 characters'';
            END IF;

            RETURN decrypted;
        END;
        $body$ LANGUAGE plpgsql SECURITY DEFINER';

    RAISE NOTICE 'Created new encryption key with ID: %', encryption_key_id;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS encrypt_github_token_trigger ON github_tokens;

-- Create the trigger
CREATE TRIGGER encrypt_github_token_trigger
    BEFORE INSERT OR UPDATE OF token ON github_tokens
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_github_token();

-- Enable RLS
ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for github_tokens
DROP POLICY IF EXISTS github_tokens_policy ON github_tokens;
CREATE POLICY github_tokens_policy ON github_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
