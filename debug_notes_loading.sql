-- Script de débogage pour vérifier pourquoi les notes ne se chargent pas
-- Exécutez ce script dans Supabase pour diagnostiquer le problème

-- 1. Vérifier les élèves de la classe
SELECT 
    'Élèves de la classe' as info,
    s.id as student_id,
    s.first_name,
    s.last_name,
    s.class_id
FROM students s
WHERE s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
ORDER BY s.last_name, s.first_name;

-- 2. Vérifier la matière
SELECT 
    'Matière' as info,
    sub.id as subject_id,
    sub.name as subject_name,
    sub.class_id
FROM subjects sub
WHERE sub.id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f';

-- 3. Vérifier toutes les notes pour cette classe et cette matière
SELECT 
    'Notes pour la classe et matière' as info,
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.exam_type,
    g.semester,
    g.exam_id,
    s.first_name,
    s.last_name,
    sub.name as subject_name
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
ORDER BY s.last_name, s.first_name, g.exam_type;

-- 4. Vérifier les notes pour les élèves spécifiques mentionnés dans les logs
SELECT 
    'Notes pour Diao Ndao' as info,
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.exam_type,
    g.semester,
    s.first_name,
    s.last_name
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
WHERE s.first_name = 'Diao' AND s.last_name = 'Ndao'
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f';

SELECT 
    'Notes pour Zeyna Aw' as info,
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.exam_type,
    g.semester,
    s.first_name,
    s.last_name
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
WHERE s.first_name = 'Zeyna' AND s.last_name = 'Aw'
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f';

-- 5. Vérifier les notes de composition (devoir + composition)
SELECT 
    'Notes de composition' as info,
    g.exam_type,
    g.semester,
    COUNT(*) as count,
    COUNT(CASE WHEN g.grade_value > 0 THEN 1 END) as notes_with_values
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
AND g.exam_type IN ('devoir', 'composition')
GROUP BY g.exam_type, g.semester;

-- 6. Vérifier s'il y a des notes avec des exam_id null
SELECT 
    'Notes avec exam_id null' as info,
    g.exam_id,
    g.exam_type,
    COUNT(*) as count
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
GROUP BY g.exam_id, g.exam_type
ORDER BY g.exam_id, g.exam_type;

