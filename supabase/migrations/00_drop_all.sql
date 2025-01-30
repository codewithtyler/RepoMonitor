-- Drop all tables, functions, and types with CASCADE to handle dependencies
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Disable row level security on all tables first
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;

    -- Drop all tables with CASCADE
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', r.tablename);
    END LOOP;

    -- Drop all user-created functions with CASCADE (excluding extension-owned functions)
    FOR r IN (
        SELECT p.proname, oidvectortypes(p.proargtypes) as args
        FROM pg_proc p
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE p.pronamespace = 'public'::regnamespace
        AND d.objid IS NULL -- Only include functions not owned by extensions
    ) LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE;', r.proname, r.args);
    END LOOP;

    -- Drop all user-created types with CASCADE (excluding extension-owned types)
    FOR r IN (
        SELECT t.typname
        FROM pg_type t
        LEFT JOIN pg_depend d ON d.objid = t.oid AND d.deptype = 'e'
        WHERE t.typnamespace = 'public'::regnamespace
        AND t.typtype = 'e'
        AND d.objid IS NULL -- Only include types not owned by extensions
    ) LOOP
        EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE;', r.typname);
    END LOOP;
END $$;
