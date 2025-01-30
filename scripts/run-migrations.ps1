# Get the Supabase URL and anon key from environment variables
$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_ROLE_KEY) {
    Write-Error "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables"
    exit 1
}

# Run migrations
Write-Host "Running migrations..."

# Run update-schema.sql
Write-Host "Running update-schema.sql..."
Get-Content "scripts/update-schema.sql" | psql "$SUPABASE_URL" -U postgres -f -

# Run create-github-tokens-table.sql
Write-Host "Running create-github-tokens-table.sql..."
Get-Content "scripts/create-github-tokens-table.sql" | psql "$SUPABASE_URL" -U postgres -f -

Write-Host "Migrations completed successfully"
