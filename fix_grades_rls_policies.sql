-- Script pour corriger les politiques RLS de la table grades
-- 1. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Users can view grades from their school" ON grades;
DROP POLICY IF EXISTS "Users can insert grades for their school" ON grades;
DROP POLICY IF EXISTS "Users can update grades from their school" ON grades;
DROP POLICY IF EXISTS "Users can delete grades from their school" ON grades;

-- 2. Vérifier l'état actuel de RLS
SELECT 
  'État RLS:' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'grades';

-- 3. Créer des politiques RLS plus permissives pour le développement
-- Politique pour la lecture (SELECT)
CREATE POLICY "Allow all users to view grades" ON grades
  FOR SELECT USING (true);

-- Politique pour l'insertion (INSERT)
CREATE POLICY "Allow all users to insert grades" ON grades
  FOR INSERT WITH CHECK (true);

-- Politique pour la mise à jour (UPDATE)
CREATE POLICY "Allow all users to update grades" ON grades
  FOR UPDATE USING (true);

-- Politique pour la suppression (DELETE)
CREATE POLICY "Allow all users to delete grades" ON grades
  FOR DELETE USING (true);

-- 4. Vérifier que les politiques ont été créées
SELECT 
  'Politiques créées:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'grades';

-- 5. Tester l'insertion avec les nouvelles politiques
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
      16.5,
      20,
      1.0,
      'examen',
      test_school_id
    )
    RETURNING id INTO test_grade_id;
    
    RAISE NOTICE '✅ Test insertion avec nouvelles politiques réussie - ID: %', test_grade_id;
    
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

-- 6. Vérifier le nombre de notes
SELECT 'Notes après test RLS:' as info, COUNT(*) as total_grades FROM grades;
