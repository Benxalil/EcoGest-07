-- Script de test pour vérifier l'affichage des notes
-- Ce script simule ce que fait l'application pour charger les notes

-- 1. Vérifier les élèves de la classe
SELECT 
    id,
    first_name,
    last_name,
    class_id
FROM students 
WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
ORDER BY last_name, first_name;

-- 2. Vérifier la matière
SELECT 
    id,
    name,
    class_id,
    coefficient
FROM subjects 
WHERE id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f';

-- 3. Vérifier les notes pour chaque élève (simulation de la logique de l'app)
WITH student_notes AS (
    SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name,
        g.exam_type,
        g.grade_value,
        g.coefficient
    FROM students s
    LEFT JOIN grades g ON s.id = g.student_id 
        AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
    WHERE s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
SELECT 
    student_id,
    first_name,
    last_name,
    MAX(CASE WHEN exam_type = 'devoir' THEN grade_value::text ELSE '' END) as devoir_note,
    MAX(CASE WHEN exam_type = 'composition' THEN grade_value::text ELSE '' END) as composition_note,
    MAX(CASE WHEN exam_type = 'examen' OR exam_type IS NULL THEN grade_value::text ELSE '' END) as simple_note,
    MAX(coefficient) as coefficient
FROM student_notes
GROUP BY student_id, first_name, last_name
ORDER BY last_name, first_name;

-- 4. Vérifier s'il y a des notes de type composition/devoir
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'MODE_COMPOSITION'
        ELSE 'MODE_SIMPLE'
    END as detected_mode
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
AND g.exam_type IN ('devoir', 'composition');

