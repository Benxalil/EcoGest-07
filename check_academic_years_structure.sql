-- Vérifier la structure de la table academic_years
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'academic_years' 
ORDER BY ordinal_position;

-- Vérifier les données existantes dans academic_years
SELECT * FROM academic_years LIMIT 5;

-- Vérifier la structure de la table classes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;

