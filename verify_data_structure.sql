-- Script pour vérifier que les deux interfaces utilisent la même structure de données
-- Exécutez ce script dans Supabase pour vérifier la cohérence

-- 1. Vérifier la structure de la table grades
SELECT 
    'Structure de la table grades' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes de la table grades
SELECT 
    'Contraintes de la table grades' as info,
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'grades' 
AND table_schema = 'public';

-- 3. Vérifier les index de la table grades
SELECT 
    'Index de la table grades' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'grades' 
AND schemaname = 'public';

-- 4. Vérifier les politiques RLS de la table grades
SELECT 
    'Politiques RLS de la table grades' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'grades' 
AND schemaname = 'public';

-- 5. Vérifier les données existantes par type d'examen
SELECT 
    'Données par type d\'examen' as info,
    exam_type,
    semester,
    COUNT(*) as count,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT subject_id) as unique_subjects
FROM grades 
GROUP BY exam_type, semester
ORDER BY exam_type, semester;

-- 6. Vérifier la cohérence des IDs
SELECT 
    'Cohérence des IDs' as info,
    'students' as table_name,
    COUNT(*) as count
FROM students
UNION ALL
SELECT 
    'subjects' as table_name,
    COUNT(*) as count
FROM subjects
UNION ALL
SELECT 
    'grades' as table_name,
    COUNT(*) as count
FROM grades;

-- 7. Vérifier les relations entre les tables
SELECT 
    'Relations entre les tables' as info,
    'grades -> students' as relation,
    COUNT(*) as grades_with_valid_student
FROM grades g
INNER JOIN students s ON g.student_id = s.id
UNION ALL
SELECT 
    'grades -> subjects' as relation,
    COUNT(*) as grades_with_valid_subject
FROM grades g
INNER JOIN subjects s ON g.subject_id = s.id;

