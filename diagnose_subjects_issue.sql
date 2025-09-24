-- Script de diagnostic pour vérifier les matières et leur liaison aux classes

-- 1. Vérifier la structure de la table subjects
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- 2. Compter le nombre total de matières
SELECT COUNT(*) as total_subjects FROM subjects;

-- 3. Vérifier les matières avec leurs classes
SELECT 
  s.id,
  s.name as subject_name,
  s.code,
  s.class_id,
  c.name as class_name,
  c.level,
  c.section
FROM subjects s
LEFT JOIN classes c ON s.class_id = c.id
ORDER BY c.name, s.name;

-- 4. Vérifier les classes disponibles
SELECT 
  id,
  name,
  level,
  section,
  school_id
FROM classes
ORDER BY name;

-- 5. Vérifier si la classe spécifique a des matières
-- Remplacez '49632d55-95fd-4fce-879a-9817cfa1fc72' par l'ID de la classe dans l'URL
SELECT 
  s.name as subject_name,
  s.code,
  s.hours_per_week,
  c.name as class_name
FROM subjects s
JOIN classes c ON s.class_id = c.id
WHERE s.class_id = '49632d55-95fd-4fce-879a-9817cfa1fc72';

-- 6. Vérifier les matières pour toutes les classes de l'école
SELECT 
  s.name as subject_name,
  s.code,
  c.name as class_name,
  c.level,
  s.hours_per_week
FROM subjects s
JOIN classes c ON s.class_id = c.id
WHERE c.school_id = (SELECT id FROM schools LIMIT 1)
ORDER BY c.name, s.name;
