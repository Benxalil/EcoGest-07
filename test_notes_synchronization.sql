-- Script de test pour vérifier la synchronisation des notes entre les deux interfaces
-- Exécutez ce script dans Supabase pour vérifier la cohérence des données

-- 1. Vérifier toutes les notes pour un élève spécifique
SELECT 
    'Notes pour un eleve specifique' as test_type,
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.max_grade,
    g.coefficient,
    g.exam_type,
    g.semester,
    g.exam_id,
    g.created_at,
    s.first_name,
    s.last_name,
    sub.name as subject_name
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'  -- Remplacez par l'ID de l'élève test
ORDER BY sub.name, g.exam_type, g.semester;

-- 2. Vérifier les notes par matière pour une classe
SELECT 
    'Notes par matiere pour une classe' as test_type,
    sub.name as subject_name,
    g.exam_type,
    g.semester,
    COUNT(*) as note_count,
    COUNT(CASE WHEN g.grade_value > 0 THEN 1 END) as notes_with_values
FROM grades g
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'  -- Remplacez par l'ID de la classe test
)
GROUP BY sub.name, g.exam_type, g.semester
ORDER BY sub.name, g.exam_type, g.semester;

-- 3. Vérifier la cohérence des types d'examens
SELECT 
    'Coherence des types d examens' as test_type,
    g.exam_type,
    g.semester,
    COUNT(*) as count,
    MIN(g.grade_value) as min_grade,
    MAX(g.grade_value) as max_grade,
    AVG(g.grade_value) as avg_grade
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
GROUP BY g.exam_type, g.semester
ORDER BY g.exam_type, g.semester;

-- 4. Vérifier les notes de composition (devoir + composition)
SELECT 
    'Notes de composition' as test_type,
    s.first_name,
    s.last_name,
    sub.name as subject_name,
    MAX(CASE WHEN g.exam_type = 'devoir' AND g.semester = 'semestre1' THEN g.grade_value END) as devoir_s1,
    MAX(CASE WHEN g.exam_type = 'composition' AND g.semester = 'semestre1' THEN g.grade_value END) as composition_s1,
    MAX(CASE WHEN g.exam_type = 'devoir' AND g.semester = 'semestre2' THEN g.grade_value END) as devoir_s2,
    MAX(CASE WHEN g.exam_type = 'composition' AND g.semester = 'semestre2' THEN g.grade_value END) as composition_s2
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.exam_type IN ('devoir', 'composition')
GROUP BY s.id, s.first_name, s.last_name, sub.id, sub.name
ORDER BY s.last_name, s.first_name, sub.name;

-- 5. Vérifier les notes simples (sans semestre)
SELECT 
    'Notes simples' as test_type,
    s.first_name,
    s.last_name,
    sub.name as subject_name,
    g.grade_value,
    g.exam_type,
    g.created_at
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND (g.exam_type IS NULL OR g.exam_type = 'examen' OR g.exam_type = 'controle' OR g.exam_type = 'tp')
ORDER BY s.last_name, s.first_name, sub.name;
