-- Script pour vérifier les types d'examens dans la table grades
-- 1. Lister toutes les notes avec leurs types d'examen
SELECT 
  'Notes existantes avec types d''examen:' as info,
  id,
  student_id,
  subject_id,
  exam_type,
  semester,
  grade_value,
  max_grade,
  created_at
FROM grades 
ORDER BY created_at DESC;

-- 2. Compter par type d'examen
SELECT 
  'Répartition par type d''examen:' as info,
  exam_type,
  COUNT(*) as count
FROM grades 
GROUP BY exam_type
ORDER BY count DESC;

-- 3. Vérifier les notes pour les étudiants spécifiques
SELECT 
  'Notes pour Diao Ndao:' as info,
  id,
  exam_type,
  semester,
  grade_value,
  max_grade
FROM grades 
WHERE student_id = (SELECT id FROM students WHERE first_name = 'Diao' AND last_name = 'Ndao' LIMIT 1)
ORDER BY created_at DESC;

-- 4. Vérifier les notes pour Zeyna Aw
SELECT 
  'Notes pour Zeyna Aw:' as info,
  id,
  exam_type,
  semester,
  grade_value,
  max_grade
FROM grades 
WHERE student_id = (SELECT id FROM students WHERE first_name = 'Zeyna' AND last_name = 'Aw' LIMIT 1)
ORDER BY created_at DESC;

