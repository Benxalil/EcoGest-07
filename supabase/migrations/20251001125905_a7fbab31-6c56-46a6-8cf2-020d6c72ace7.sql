-- Migration corrigée: utiliser teachers.id au lieu de teachers.user_id

-- 1. Créer les enseignants manquants dans la table teachers
INSERT INTO teachers (user_id, school_id, employee_number, first_name, last_name, phone, is_active)
SELECT 
  p.id as user_id,
  p.school_id,
  'PROF' || LPAD(ROW_NUMBER() OVER (PARTITION BY p.school_id ORDER BY p.created_at)::text, 3, '0') as employee_number,
  p.first_name,
  p.last_name,
  p.phone,
  p.is_active
FROM profiles p
WHERE p.role = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM teachers t 
    WHERE t.user_id = p.id
  )
ON CONFLICT (school_id, employee_number) DO NOTHING;

-- 2. Vérifier les enseignants créés
SELECT 
  'Enseignants créés' as status,
  t.id,
  t.user_id,
  t.first_name || ' ' || t.last_name as full_name
FROM teachers t;

-- 3. Mettre à jour schedules.teacher_id avec teachers.id (pas user_id!)
UPDATE schedules
SET teacher_id = teachers.id
FROM teachers
WHERE schedules.teacher IS NOT NULL
  AND schedules.teacher_id IS NULL
  AND CONCAT(teachers.first_name, ' ', teachers.last_name) = schedules.teacher
  AND teachers.school_id = schedules.school_id;

-- 4. Vérifier les mises à jour
SELECT 
  'Schedules mis à jour' as status,
  COUNT(*) as total
FROM schedules
WHERE teacher_id IS NOT NULL;

-- 5. Afficher les associations finales
SELECT 
  s.id as schedule_id,
  s.teacher as teacher_name,
  s.teacher_id,
  t.first_name || ' ' || t.last_name as teacher_full_name,
  t.user_id as teacher_user_id,
  c.name as class_name,
  s.day
FROM schedules s
LEFT JOIN teachers t ON s.teacher_id = t.id
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.teacher_id IS NOT NULL
ORDER BY c.name, s.day;

SELECT 'Migration terminée avec succès' as result;