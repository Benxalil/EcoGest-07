-- Test simple pour vérifier la table grades
-- 1. Vérifier que la table existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') 
    THEN '✅ Table grades EXISTE'
    ELSE '❌ Table grades N''EXISTE PAS'
  END as status;

-- 2. Compter les notes existantes
SELECT 
  'Notes existantes:' as info,
  COUNT(*) as total_grades 
FROM grades;

-- 3. Lister les 5 dernières notes (si elles existent)
SELECT 
  'Dernières notes:' as info,
  id,
  student_id,
  subject_id,
  grade_value,
  max_grade,
  exam_type,
  created_at
FROM grades 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Vérifier les contraintes de clé étrangère
SELECT 
  'Contraintes FK:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'grades';
