-- Créer des notes de test pour l'examen de composition avec la bonne school_id
-- Utiliser la school_id correcte trouvée dans la classe

INSERT INTO grades (school_id, student_id, subject_id, exam_id, grade_value, max_grade, coefficient, exam_type, semester, created_by)
SELECT 
  c.school_id,
  s.id as student_id,
  sub.id as subject_id,
  'b32d588f-9f90-41ff-b38a-089928ebfe53' as exam_id,
  (RANDOM() * 8 + 12)::numeric(5,2) as grade_value, -- Notes entre 12 et 20
  20.00 as max_grade,
  sub.coefficient,
  'devoir' as exam_type, -- Notes de devoir
  'semestre1' as semester,
  auth.uid() as created_by
FROM students s
CROSS JOIN subjects sub
JOIN classes c ON s.class_id = c.id
WHERE s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
  AND sub.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
  AND s.school_id = sub.school_id
  AND c.id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
LIMIT 15;

-- Ajouter les notes de composition
INSERT INTO grades (school_id, student_id, subject_id, exam_id, grade_value, max_grade, coefficient, exam_type, semester, created_by)
SELECT 
  c.school_id,
  s.id as student_id,
  sub.id as subject_id,
  'b32d588f-9f90-41ff-b38a-089928ebfe53' as exam_id,
  (RANDOM() * 9 + 11)::numeric(5,2) as grade_value, -- Notes entre 11 et 20  
  20.00 as max_grade,
  sub.coefficient,
  'composition' as exam_type, -- Notes de composition
  'semestre1' as semester,
  auth.uid() as created_by
FROM students s
CROSS JOIN subjects sub
JOIN classes c ON s.class_id = c.id
WHERE s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
  AND sub.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
  AND s.school_id = sub.school_id
  AND c.id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
LIMIT 15;