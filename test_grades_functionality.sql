-- Script de test pour vérifier le fonctionnement de la table grades
-- 1. Vérifier l'existence de la table
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') 
    THEN '✅ Table grades EXISTE'
    ELSE '❌ Table grades N''EXISTE PAS'
  END as table_status;

-- 2. Vérifier la structure de la table
SELECT 
  'Structure de la table grades:' as info,
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier les contraintes de clé étrangère
SELECT 
  'Contraintes de clé étrangère:' as info,
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='grades';

-- 4. Vérifier les données de référence nécessaires
SELECT 
  'Vérification des données de référence:' as info,
  'students' as table_name, 
  COUNT(*) as count 
FROM students 
WHERE id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid
UNION ALL
SELECT 
  'Vérification des données de référence:' as info,
  'subjects' as table_name, 
  COUNT(*) as count 
FROM subjects 
WHERE id = '2f64cfa6-cc9d-42da-95c3-68b615ddc2aa'::uuid
UNION ALL
SELECT 
  'Vérification des données de référence:' as info,
  'schools' as table_name, 
  COUNT(*) as count 
FROM schools 
WHERE id = '0adfd464-9161-4552-92ba-419cf8bb3199'::uuid;

-- 5. Tester une insertion complète
DO $$
DECLARE
  test_grade_id UUID;
BEGIN
  -- Insérer une note de test
  INSERT INTO grades (student_id, subject_id, grade_value, max_grade, coefficient, exam_type, school_id)
  VALUES (
    'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid,
    '2f64cfa6-cc9d-42da-95c3-68b615ddc2aa'::uuid,
    15.5,
    20,
    1.0,
    'composition',
    '0adfd464-9161-4552-92ba-419cf8bb3199'::uuid
  )
  RETURNING id INTO test_grade_id;
  
  RAISE NOTICE '✅ Insertion réussie - ID: %', test_grade_id;
  
  -- Vérifier que la note a été insérée
  IF EXISTS (SELECT 1 FROM grades WHERE id = test_grade_id) THEN
    RAISE NOTICE '✅ Note trouvée dans la table';
  ELSE
    RAISE NOTICE '❌ Note non trouvée dans la table';
  END IF;
  
  -- Nettoyer le test
  DELETE FROM grades WHERE id = test_grade_id;
  RAISE NOTICE '✅ Test nettoyé';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors du test: %', SQLERRM;
END $$;

-- 6. Vérifier les politiques RLS
SELECT 
  'Politiques RLS:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'grades';

-- 7. Compter les notes existantes
SELECT 
  'Notes existantes:' as info,
  COUNT(*) as total_grades 
FROM grades;
