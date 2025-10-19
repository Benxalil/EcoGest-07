-- Script pour nettoyer et recréer les données de la table subjects

-- Supprimer tous les enregistrements existants
DELETE FROM subjects;

-- Vérifier que la table est vide
SELECT COUNT(*) as total_subjects FROM subjects;

-- Maintenant, insérer les nouvelles données avec des codes valides
WITH class_ids AS (
  SELECT id, name, level, section 
  FROM classes 
  LIMIT 5
),
school_ids AS (
  SELECT id 
  FROM schools 
  LIMIT 1
)
INSERT INTO subjects (name, code, abbreviation, class_id, school_id, hours_per_week)
SELECT 
  'Mathématiques',
  'MATH',
  'MATH',
  c.id,
  s.id,
  5
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Français',
  'FR',
  'FR',
  c.id,
  s.id,
  4
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Sciences',
  'SCI',
  'SCI',
  c.id,
  s.id,
  3
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Histoire-Géographie',
  'H-G',
  'H-G',
  c.id,
  s.id,
  2
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Anglais',
  'ANG',
  'ANG',
  c.id,
  s.id,
  3
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Éducation Physique',
  'EPS',
  'EPS',
  c.id,
  s.id,
  2
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Arts Plastiques',
  'ART',
  'ART',
  c.id,
  s.id,
  2
FROM class_ids c, school_ids s
UNION ALL
SELECT 
  'Musique',
  'MUS',
  'MUS',
  c.id,
  s.id,
  1
FROM class_ids c, school_ids s;

-- Vérifier les données finales
SELECT 
  s.name as subject_name,
  s.code,
  s.abbreviation,
  c.name as class_name,
  c.level,
  s.hours_per_week
FROM subjects s
LEFT JOIN classes c ON s.class_id = c.id
ORDER BY c.name, s.name;
