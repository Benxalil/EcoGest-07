-- Script pour insérer des matières pour toutes les classes existantes

-- Récupérer toutes les classes avec leur école
WITH class_school_info AS (
  SELECT 
    c.id as class_id,
    c.name as class_name,
    c.level,
    c.section,
    c.school_id
  FROM classes c
  WHERE c.school_id IS NOT NULL
)
-- Insérer des matières pour chaque classe
INSERT INTO subjects (name, code, abbreviation, class_id, school_id, hours_per_week)
SELECT 
  'Mathématiques',
  'MATH',
  'MATH',
  class_id,
  school_id,
  5
FROM class_school_info
UNION ALL
SELECT 
  'Français',
  'FR',
  'FR',
  class_id,
  school_id,
  4
FROM class_school_info
UNION ALL
SELECT 
  'Sciences',
  'SCI',
  'SCI',
  class_id,
  school_id,
  3
FROM class_school_info
UNION ALL
SELECT 
  'Histoire-Géographie',
  'H-G',
  'H-G',
  class_id,
  school_id,
  2
FROM class_school_info
UNION ALL
SELECT 
  'Anglais',
  'ANG',
  'ANG',
  class_id,
  school_id,
  3
FROM class_school_info
UNION ALL
SELECT 
  'Éducation Physique',
  'EPS',
  'EPS',
  class_id,
  school_id,
  2
FROM class_school_info
ON CONFLICT DO NOTHING;

-- Vérifier les matières insérées
SELECT 
  s.name as subject_name,
  s.code,
  s.abbreviation,
  s.hours_per_week,
  c.name as class_name,
  c.level,
  c.section
FROM subjects s
JOIN classes c ON s.class_id = c.id
ORDER BY c.name, s.name;
