-- Script corrigé pour forcer l'insertion de matières avec conversion UUID

-- D'abord, vérifier si la classe existe
SELECT 
  id,
  name,
  level,
  section,
  school_id
FROM classes 
WHERE id = '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid;

-- Récupérer l'ID de l'école pour cette classe
WITH school_info AS (
  SELECT school_id 
  FROM classes 
  WHERE id = '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid
  LIMIT 1
)
-- Insérer des matières spécifiquement pour cette classe avec conversion UUID
INSERT INTO subjects (name, code, abbreviation, class_id, school_id, hours_per_week)
SELECT 
  'Mathématiques',
  'MATH',
  'MATH',
  '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid,
  school_id,
  5
FROM school_info
UNION ALL
SELECT 
  'Français',
  'FR',
  'FR',
  '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid,
  school_id,
  4
FROM school_info
UNION ALL
SELECT 
  'Sciences',
  'SCI',
  'SCI',
  '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid,
  school_id,
  3
FROM school_info
UNION ALL
SELECT 
  'Histoire-Géographie',
  'H-G',
  'H-G',
  '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid,
  school_id,
  2
FROM school_info
UNION ALL
SELECT 
  'Anglais',
  'ANG',
  'ANG',
  '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid,
  school_id,
  3
FROM school_info
UNION ALL
SELECT 
  'Éducation Physique',
  'EPS',
  'EPS',
  '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid,
  school_id,
  2
FROM school_info
ON CONFLICT DO NOTHING;

-- Vérifier que les matières ont été insérées
SELECT 
  s.name as subject_name,
  s.code,
  s.abbreviation,
  s.hours_per_week,
  c.name as class_name,
  c.level
FROM subjects s
JOIN classes c ON s.class_id = c.id
WHERE s.class_id = '49632d55-95fd-4fce-879a-9817cfa1fc72'::uuid
ORDER BY s.name;
