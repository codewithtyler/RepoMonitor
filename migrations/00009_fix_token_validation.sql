-- Fix token validation in encryption/decryption functions
DO $$
DECLARE
    encryption_key_id uuid;
BEGIN
    -- First, clear any existing tokens since we're having encryption issues
    TRUNCATE TABLE github_tokens;

    -- Drop existing key if it exists
    DELETE FROM pgsodium.key WHERE name = 'github_token_key_v3';

    -- Create a new key
    SELECT id INTO encryption_key_id
    FROM pgsodium.create_key(
        name => 'github_token_key_v3',
        key_type => 'aead-det'
    );

    -- Update the encryption function
    EXECUTE format('
        CREATE OR REPLACE FUNCTION encrypt_github_token() RETURNS trigger AS $body$
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
        $body$ LANGUAGE plpgsql SECURITY DEFINER;
    ', encryption_key_id);

    -- Update the decryption function
    EXECUTE format('
        CREATE OR REPLACE FUNCTION decrypt_github_token(encrypted_token TEXT)
        RETURNS TEXT AS $body$
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
        $body$ LANGUAGE plpgsql SECURITY DEFINER;
    ', encryption_key_id);

    RAISE NOTICE 'Created new encryption key with ID: %', encryption_key_id;
END $$;
