# GitHub Token Encryption

## Current Implementation
Currently, we use a custom encryption setup that requires manually setting `app.settings.encryption_key` in Supabase. This approach:
- Uses AES-GCM encryption with a nonce
- Requires manual key setup
- Stores tokens with separate `raw_token`, `encrypted_token`, and `nonce` fields
- Uses custom encryption/decryption functions

## Target Implementation (from codewithtyler)
We will align with Tyler's implementation which:
- Uses Supabase's built-in `pgsodium` extension for encryption
- Creates a dedicated encryption key using `pgsodium.crypto_aead_det_keygen()`
- Simplifies token storage to a single encrypted field
- Adds token format validation (must start with 'gho_')
- Eliminates need for manual encryption key setup

## Migration Plan
1. Create new migration that will:
   - Drop current encryption functions and triggers
   - Enable pgsodium extension
   - Create new encryption key using pgsodium
   - Simplify github_tokens table structure
   - Set up new encryption/decryption functions
   - Add token format validation
   - Set up appropriate triggers

2. Benefits:
   - Simplified token storage
   - Built-in encryption using Supabase's pgsodium
   - No manual key setup required
   - Better token validation
   - Aligned with upstream implementation

## Implementation Details
The new implementation will use:
- `pgsodium.crypto_aead_det_keygen()` for key generation
- `pgsodium.crypto_aead_det_encrypt()` for encryption
- `pgsodium.crypto_aead_det_decrypt()` for decryption
- Automatic token format validation (gho_ prefix)
- Single encrypted token field instead of separate fields

## Security Considerations
- All existing tokens will need to be re-encrypted
- Users will need to re-authenticate after migration
- No downtime required for migration
- Improved security through Supabase's built-in encryption
