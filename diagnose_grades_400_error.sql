-- Diagnostic complet de l'erreur 400 sur la table grades
-- 1. Vérifier que la table existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') 
    THEN 'Table grades EXISTE'
    ELSE 'Table grades N''EXISTE PAS'
  END as table_status;

-- 2. Vérifier la structure exacte
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier les contraintes
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'grades' 
AND table_schema = 'public';

-- 4. Tester une insertion simple
INSERT INTO grades (student_id, subject_id, grade_value, max_grade, coefficient, exam_type, school_id)
VALUES (
  'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid,
  '2f64cfa6-cc9d-42da-95c3-68b615ddc2aa'::uuid,
  15.5,
  20,
  1.0,
  'examen',
  '0adfd464-9161-4552-92ba-419cf8bb3199'::uuid
);

-- 5. Vérifier que l'insertion a fonctionné
SELECT COUNT(*) as total_grades FROM grades;

-- 6. Nettoyer le test
DELETE FROM grades WHERE student_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'::uuid;
