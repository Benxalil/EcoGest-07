-- Script pour vérifier la vraie structure de la table students
-- 1. Vérifier l'existence de la table students
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') 
    THEN '✅ Table students EXISTE'
    ELSE '❌ Table students N''EXISTE PAS'
  END as table_status;

-- 2. Vérifier la structure exacte de la table students
SELECT 
  'Structure de la table students:' as info,
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Lister quelques étudiants avec leurs vraies colonnes
SELECT 
  'Étudiants disponibles (avec vraies colonnes):' as info,
  *
FROM students 
LIMIT 3;

-- 4. Vérifier la structure de la table subjects
SELECT 
  'Structure de la table subjects:' as info,
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'subjects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Vérifier la structure de la table classes
SELECT 
  'Structure de la table classes:' as info,
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'classes' 
AND table_schema = 'public'
ORDER BY ordinal_position;
