-- Vérifier la structure actuelle de la table grades
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Vérifier s'il y a des données
SELECT COUNT(*) as total_grades FROM grades;
