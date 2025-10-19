-- Script pour insérer des notes de test si elles n'existent pas
-- Exécutez ce script dans Supabase pour créer des données de test

-- 1. Vérifier d'abord s'il y a des notes existantes
SELECT 
    'Vérification des notes existantes' as info,
    COUNT(*) as total_notes
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f';

-- 2. Insérer des notes de test pour Diao Ndao (si elles n'existent pas)
INSERT INTO grades (
    student_id,
    subject_id,
    grade_value,
    max_grade,
    coefficient,
    exam_type,
    semester,
    school_id,
    created_by
)
SELECT 
    s.id as student_id,
    '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f' as subject_id,
    17 as grade_value,
    20 as max_grade,
    1 as coefficient,
    'devoir' as exam_type,
    'semestre1' as semester,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as school_id,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as created_by
FROM students s
WHERE s.first_name = 'Diao' AND s.last_name = 'Ndao'
AND s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
AND NOT EXISTS (
    SELECT 1 FROM grades g 
    WHERE g.student_id = s.id 
    AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
    AND g.exam_type = 'devoir'
    AND g.semester = 'semestre1'
);

INSERT INTO grades (
    student_id,
    subject_id,
    grade_value,
    max_grade,
    coefficient,
    exam_type,
    semester,
    school_id,
    created_by
)
SELECT 
    s.id as student_id,
    '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f' as subject_id,
    19 as grade_value,
    20 as max_grade,
    1 as coefficient,
    'composition' as exam_type,
    'semestre1' as semester,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as school_id,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as created_by
FROM students s
WHERE s.first_name = 'Diao' AND s.last_name = 'Ndao'
AND s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
AND NOT EXISTS (
    SELECT 1 FROM grades g 
    WHERE g.student_id = s.id 
    AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
    AND g.exam_type = 'composition'
    AND g.semester = 'semestre1'
);

-- 3. Insérer des notes de test pour Zeyna Aw (si elles n'existent pas)
INSERT INTO grades (
    student_id,
    subject_id,
    grade_value,
    max_grade,
    coefficient,
    exam_type,
    semester,
    school_id,
    created_by
)
SELECT 
    s.id as student_id,
    '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f' as subject_id,
    18 as grade_value,
    20 as max_grade,
    1 as coefficient,
    'devoir' as exam_type,
    'semestre1' as semester,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as school_id,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as created_by
FROM students s
WHERE s.first_name = 'Zeyna' AND s.last_name = 'Aw'
AND s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
AND NOT EXISTS (
    SELECT 1 FROM grades g 
    WHERE g.student_id = s.id 
    AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
    AND g.exam_type = 'devoir'
    AND g.semester = 'semestre1'
);

INSERT INTO grades (
    student_id,
    subject_id,
    grade_value,
    max_grade,
    coefficient,
    exam_type,
    semester,
    school_id,
    created_by
)
SELECT 
    s.id as student_id,
    '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f' as subject_id,
    18 as grade_value,
    20 as max_grade,
    1 as coefficient,
    'composition' as exam_type,
    'semestre1' as semester,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as school_id,
    '0adfd464-9161-4552-92ba-419cf8bb3199' as created_by
FROM students s
WHERE s.first_name = 'Zeyna' AND s.last_name = 'Aw'
AND s.class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
AND NOT EXISTS (
    SELECT 1 FROM grades g 
    WHERE g.student_id = s.id 
    AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
    AND g.exam_type = 'composition'
    AND g.semester = 'semestre1'
);

-- 4. Vérifier les notes insérées
SELECT 
    'Notes après insertion' as info,
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
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
AND g.subject_id = '3b3a9c3a-8692-4aee-9e3c-cfc6fd2b550f'
ORDER BY s.last_name, s.first_name, g.exam_type;
