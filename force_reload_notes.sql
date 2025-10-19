-- Script pour forcer le rechargement des notes
-- Ce script peut être utilisé pour nettoyer et recréer les notes si nécessaire

-- 1. Vérifier l'état actuel des notes
SELECT 
    'État actuel des notes' as info,
    COUNT(*) as total_notes,
    COUNT(CASE WHEN exam_type = 'devoir' THEN 1 END) as devoir_notes,
    COUNT(CASE WHEN exam_type = 'composition' THEN 1 END) as composition_notes,
    COUNT(CASE WHEN exam_type = 'examen' OR exam_type IS NULL THEN 1 END) as simple_notes
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f';

-- 2. Afficher les notes existantes avec détails
SELECT 
    g.id,
    s.first_name,
    s.last_name,
    g.exam_type,
    g.grade_value,
    g.max_grade,
    g.coefficient,
    g.semester,
    g.created_at
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
ORDER BY s.last_name, s.first_name, g.exam_type;

-- 3. Si vous voulez supprimer toutes les notes pour recommencer (DÉCOMMENTEZ SEULEMENT SI NÉCESSAIRE)
-- DELETE FROM grades 
-- WHERE student_id IN (
--     SELECT id FROM students 
--     WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
-- )
-- AND subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f';

