-- Vérifier la structure actuelle de la table subjects
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;
