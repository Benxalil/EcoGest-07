-- Script pour vérifier les données des étudiants et corriger le problème
-- 1. Vérifier si la table students existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') 
    THEN '✅ Table students EXISTE'
    ELSE '❌ Table students N''EXISTE PAS'
  END as table_status;

-- 2. Vérifier la structure de la table students
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

-- 3. Lister tous les étudiants disponibles
SELECT 
  'Étudiants disponibles:' as info,
  id,
  nom,
  prenom,
  classe
FROM students 
ORDER BY nom, prenom
LIMIT 10;

-- 4. Compter le nombre total d'étudiants
SELECT 
  'Nombre total d''étudiants:' as info,
  COUNT(*) as total_students 
FROM students;

-- 5. Vérifier si l'ID spécifique existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM students WHERE id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid)
    THEN '✅ L''ID f5d578f1-bfe9-4b45-9666-8fd7d60b2d30 EXISTE dans students'
    ELSE '❌ L''ID f5d578f1-bfe9-4b45-9666-8fd7d60b2d30 N''EXISTE PAS dans students'
  END as student_exists;

-- 6. Vérifier les matières disponibles
SELECT 
  'Matières disponibles:' as info,
  id,
  name,
  class_id
FROM subjects 
ORDER BY name
LIMIT 10;

-- 7. Vérifier les écoles disponibles
SELECT 
  'Écoles disponibles:' as info,
  id,
  name
FROM schools 
ORDER BY name
LIMIT 5;
