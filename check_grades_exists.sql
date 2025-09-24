-- Vérifier si la table grades existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'grades';

-- Si elle n'existe pas, vous verrez un résultat vide
