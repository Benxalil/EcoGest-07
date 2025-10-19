-- Vérifier la structure de la table classes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;

-- Vérifier les données existantes dans classes
SELECT * FROM classes LIMIT 5;

