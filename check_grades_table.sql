-- Vérifier si la table grades existe et sa structure
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'grades';

-- Si la table existe, vérifier sa structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;
