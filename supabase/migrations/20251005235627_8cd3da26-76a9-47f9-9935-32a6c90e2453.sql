-- Étape 1: Nettoyer les doublons et corriger les exam_id pour les élèves de CI
-- Classe CI: 49632d55-95fd-4fce-879a-9817cfa1fc72

-- D'abord, créer une table temporaire avec les notes à conserver (les plus récentes)
CREATE TEMP TABLE grades_to_keep AS
SELECT DISTINCT ON (student_id, subject_id, exam_type, semester)
  id,
  student_id,
  subject_id,
  exam_id,
  exam_type,
  semester,
  grade_value,
  created_at
FROM grades
WHERE student_id IN (
  SELECT id FROM students WHERE class_id = '49632d55-95fd-4fce-879a-9817cfa1fc72'
)
ORDER BY student_id, subject_id, exam_type, semester, created_at DESC;

-- Supprimer toutes les notes des élèves de CI
DELETE FROM grades
WHERE student_id IN (
  SELECT id FROM students WHERE class_id = '49632d55-95fd-4fce-879a-9817cfa1fc72'
);

-- Réinsérer uniquement les notes à conserver avec les bons exam_id
INSERT INTO grades (id, student_id, subject_id, exam_id, grade_value, max_grade, coefficient, semester, exam_type, created_at, updated_at, school_id, created_by)
SELECT 
  gtk.id,
  gtk.student_id,
  gtk.subject_id,
  -- Assigner le bon exam_id selon le type
  CASE 
    WHEN gtk.exam_type IN ('composition', 'devoir') THEN '5f0fed42-a1fa-4664-b8dd-cc34d0dc45c9'::uuid
    WHEN gtk.exam_type = 'examen' THEN '43663ca9-9cd1-45b8-9cc1-72ca977bd7ae'::uuid
    ELSE gtk.exam_id
  END as exam_id,
  gtk.grade_value,
  20.0 as max_grade,
  sub.coefficient,
  gtk.semester,
  gtk.exam_type,
  gtk.created_at,
  NOW() as updated_at,
  s.school_id,
  NULL as created_by
FROM grades_to_keep gtk
JOIN students s ON gtk.student_id = s.id
JOIN subjects sub ON gtk.subject_id = sub.id;

-- Afficher le résultat
SELECT 
  'Nettoyage et correction terminés' as status,
  COUNT(*) as total_notes,
  COUNT(DISTINCT student_id) as nombre_eleves,
  COUNT(DISTINCT subject_id) as nombre_matieres
FROM grades
WHERE student_id IN (
  SELECT id FROM students WHERE class_id = '49632d55-95fd-4fce-879a-9817cfa1fc72'
);

-- Nettoyer la table temporaire
DROP TABLE grades_to_keep;