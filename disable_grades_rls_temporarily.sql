-- Script pour désactiver temporairement RLS sur la table grades
-- ATTENTION: Ceci est pour le développement seulement, ne pas utiliser en production !

-- 1. Désactiver RLS sur la table grades
ALTER TABLE grades DISABLE ROW LEVEL SECURITY;

-- 2. Vérifier que RLS est désactivé
SELECT 
  'État RLS après désactivation:' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'grades';

-- 3. Tester l'insertion sans RLS
DO $$
DECLARE
  test_student_id UUID;
  test_subject_id UUID;
  test_school_id UUID;
  test_grade_id UUID;
BEGIN
  -- Récupérer les IDs existants
  SELECT id INTO test_student_id FROM students LIMIT 1;
  SELECT id INTO test_subject_id FROM subjects LIMIT 1;
  SELECT id INTO test_school_id FROM schools LIMIT 1;
  
  IF test_student_id IS NOT NULL AND test_subject_id IS NOT NULL AND test_school_id IS NOT NULL THEN
    -- Insérer une note de test
    INSERT INTO grades (student_id, subject_id, grade_value, max_grade, coefficient, exam_type, school_id)
    VALUES (
      test_student_id,
      test_subject_id,
      17.5,
      20,
      1.0,
      'composition',
      test_school_id
    )
    RETURNING id INTO test_grade_id;
    
    RAISE NOTICE '✅ Test insertion sans RLS réussie - ID: %', test_grade_id;
    
    -- Nettoyer le test
    DELETE FROM grades WHERE id = test_grade_id;
    RAISE NOTICE '✅ Test nettoyé';
  ELSE
    RAISE NOTICE '❌ Données de référence manquantes pour le test';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors du test: %', SQLERRM;
END $$;

-- 4. Vérifier le nombre de notes
SELECT 'Notes après test sans RLS:' as info, COUNT(*) as total_grades FROM grades;
