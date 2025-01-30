-- Grant execute permissions on token encryption/decryption functions
GRANT EXECUTE ON FUNCTION encrypt_github_token TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_github_token TO service_role;

GRANT EXECUTE ON FUNCTION decrypt_github_token TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_github_token TO service_role;

-- Grant usage on pgsodium to service role
GRANT USAGE ON SCHEMA pgsodium TO service_role;
