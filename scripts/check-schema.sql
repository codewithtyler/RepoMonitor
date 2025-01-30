\d+ repositories;

-- Show table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'repositories'
ORDER BY ordinal_position;

-- Show table constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'repositories';

-- Show indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'repositories';

-- Show RLS policies
SELECT *
FROM pg_policies
WHERE tablename = 'repositories';
