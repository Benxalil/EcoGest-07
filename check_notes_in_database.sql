-- Script pour vérifier les notes enregistrées en base de données
-- Exécutez ce script dans Supabase pour voir les notes existantes

-- 1. Vérifier toutes les notes pour la classe et matière spécifiques
SELECT 
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.max_grade,
    g.coefficient,
    g.exam_type,
    g.semester,
    g.created_at,
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

-- 2. Compter les notes par type d'examen
SELECT 
    exam_type,
    COUNT(*) as count,
    COUNT(CASE WHEN grade_value IS NOT NULL THEN 1 END) as with_grades
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
GROUP BY exam_type;

-- 3. Vérifier les notes de composition spécifiquement
SELECT 
    g.id,
    g.grade_value,
    g.exam_type,
    s.first_name,
    s.last_name
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
AND g.exam_type IN ('devoir', 'composition')
ORDER BY s.last_name, s.first_name, g.exam_type;

