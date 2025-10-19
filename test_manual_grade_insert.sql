-- Test d'insertion manuelle d'une note
-- 1. Vérifier les données disponibles
SELECT 'Étudiants disponibles:' as info, id, first_name, last_name FROM students LIMIT 3;
SELECT 'Matières disponibles:' as info, id, name FROM subjects LIMIT 3;
SELECT 'Écoles disponibles:' as info, id, name FROM schools LIMIT 3;

-- 2. Tester l'insertion d'une note
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
  
  RAISE NOTICE 'IDs récupérés - Student: %, Subject: %, School: %', 
    test_student_id, test_subject_id, test_school_id;
  
  IF test_student_id IS NOT NULL AND test_subject_id IS NOT NULL AND test_school_id IS NOT NULL THEN
    -- Insérer une note de test
    INSERT INTO grades (student_id, subject_id, grade_value, max_grade, coefficient, exam_type, school_id)
    VALUES (
      test_student_id,
      test_subject_id,
      15.5,
      20,
      1.0,
      'composition',
      test_school_id
    )
    RETURNING id INTO test_grade_id;
    
    RAISE NOTICE '✅ Note insérée avec succès - ID: %', test_grade_id;
    
    -- Vérifier que la note existe
    IF EXISTS (SELECT 1 FROM grades WHERE id = test_grade_id) THEN
      RAISE NOTICE '✅ Note confirmée dans la table';
    ELSE
      RAISE NOTICE '❌ Note non trouvée après insertion';
    END IF;
    
  ELSE
    RAISE NOTICE '❌ Données de référence manquantes';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors de l''insertion: %', SQLERRM;
END $$;

-- 3. Vérifier le nombre de notes après le test
SELECT 'Notes après test:' as info, COUNT(*) as total_grades FROM grades;
