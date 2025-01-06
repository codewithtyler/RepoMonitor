-- Enable pgsodium extension
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create a key and store its ID
DO $$
DECLARE
    encryption_key_id uuid;
BEGIN
    -- Get or create a key using pgsodium's key creation function
    SELECT id INTO encryption_key_id 
    FROM pgsodium.create_key(
        name => 'github_token_key',
        raw_key => pgsodium.crypto_aead_det_keygen(),
        key_context => 'github_token',
        key_type => 'aead-det'
    );

    -- Create the encryption function using the key
    EXECUTE format('
        CREATE OR REPLACE FUNCTION encrypt_github_token() RETURNS trigger AS $func$
        BEGIN
            IF NEW.token IS NOT NULL THEN
                NEW.token = encode(
                    pgsodium.crypto_aead_det_encrypt(
                        convert_to(NEW.token, ''utf8''),
                        convert_to(''github_token'', ''utf8''),
                        %L::uuid
                    ),
                    ''base64''
                );
            END IF;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', encryption_key_id);

    -- Create the decryption function using the key
    EXECUTE format('
        CREATE OR REPLACE FUNCTION decrypt_github_token(encrypted_token TEXT) 
        RETURNS TEXT AS $func$
        BEGIN
            RETURN convert_from(
                pgsodium.crypto_aead_det_decrypt(
                    decode(encrypted_token, ''base64''),
                    convert_to(''github_token'', ''utf8''),
                    %L::uuid
                ),
                ''utf8''
            );
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', encryption_key_id);
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS encrypt_github_token_trigger ON github_tokens;

-- Recreate trigger to encrypt token on insert/update
CREATE TRIGGER encrypt_github_token_trigger
    BEFORE INSERT OR UPDATE OF token ON github_tokens
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_github_token();