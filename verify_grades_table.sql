-- Vérifier que la table grades existe et sa structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Vérifier qu'il y a des données (devrait être vide au début)
SELECT COUNT(*) as total_grades FROM grades;
