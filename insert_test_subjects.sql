-- Script pour insérer des matières de test avec de vrais IDs de classes

-- D'abord, récupérer les IDs des classes existantes
WITH class_ids AS (
  SELECT id, name, level, section 
  FROM classes 
  LIMIT 3
),
school_ids AS (
  SELECT id 
  FROM schools 
  LIMIT 1
)
-- Insérer des matières pour chaque classe
INSERT INTO subjects (name, abbreviation, class_id, school_id, hours_per_week)
SELECT 
  'Mathématiques',
  'MATH',
  c.id,
  s.id,
  5
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Français',
  'FR',
  c.id,
  s.id,
  4
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Sciences',
  'SCI',
  c.id,
  s.id,
  3
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Histoire-Géographie',
  'H-G',
  c.id,
  s.id,
  2
FROM class_ids c, school_ids s
ON CONFLICT DO NOTHING;

-- Vérifier les données insérées
SELECT 
  s.name as subject_name,
  s.abbreviation,
  c.name as class_name,
  c.level,
  s.hours_per_week
FROM subjects s
LEFT JOIN classes c ON s.class_id = c.id
ORDER BY c.name, s.name;
