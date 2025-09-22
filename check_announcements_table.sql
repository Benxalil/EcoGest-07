-- Vérifier si la table announcements existe et sa structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'announcements'
ORDER BY ordinal_position;

-- Vérifier les données existantes
SELECT COUNT(*) as total_announcements FROM announcements;

-- Vérifier les politiques RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'announcements';
