-- Script de test final pour la gestion des notes
-- Ce script teste tous les aspects de la gestion des notes

-- 1. Vérifier la structure de la base de données
SELECT 'Vérification de la structure de la base de données' as test_step;

-- Vérifier que la table grades existe
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'grades' 
ORDER BY ordinal_position;

-- Vérifier que la table exams existe
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'exams' 
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes de clé étrangère
SELECT 'Vérification des contraintes de clé étrangère' as test_step;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'grades'
    AND kcu.column_name = 'exam_id';

-- 3. Vérifier les données existantes
SELECT 'Vérification des données existantes' as test_step;

-- Compter les examens
SELECT 'Examens existants:' as info, COUNT(*) as count FROM exams;

-- Compter les notes
SELECT 'Notes existantes:' as info, COUNT(*) as count FROM grades;

-- Vérifier les types d'examens
SELECT 'Types d\'examens:' as info, title, COUNT(*) as count 
FROM exams 
GROUP BY title 
ORDER BY count DESC;

-- 4. Test de création d'un examen de composition
SELECT 'Test de création d\'un examen de composition' as test_step;

-- Créer un examen de composition de test
INSERT INTO exams (id, title, description, class_id, school_id, created_by)
VALUES (
    gen_random_uuid(),
    'Première Composition',
    'Examen de composition de test',
    'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', -- Remplacez par un class_id valide
    'your-school-id', -- Remplacez par un school_id valide
    'your-user-id' -- Remplacez par un user_id valide
) ON CONFLICT DO NOTHING;

-- 5. Test de création d'un examen non-composition
SELECT 'Test de création d\'un examen non-composition' as test_step;

-- Créer un examen non-composition de test
INSERT INTO exams (id, title, description, class_id, school_id, created_by)
VALUES (
    gen_random_uuid(),
    'Examen Blanc',
    'Examen blanc de test',
    'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30', -- Remplacez par un class_id valide
    'your-school-id', -- Remplacez par un school_id valide
    'your-user-id' -- Remplacez par un user_id valide
) ON CONFLICT DO NOTHING;

-- 6. Vérifier les examens créés
SELECT 'Examens créés:' as test_step;
SELECT id, title, class_id, created_at 
FROM exams 
WHERE title IN ('Première Composition', 'Examen Blanc')
ORDER BY created_at DESC;

-- 7. Test de suppression en cascade (ATTENTION: Cette section supprime des données)
SELECT 'Test de suppression en cascade' as test_step;

-- Sélectionner un examen de test pour la suppression
SELECT 'Examen sélectionné pour le test de suppression:' as info;
SELECT id, title, class_id 
FROM exams 
WHERE title = 'Examen Blanc'
LIMIT 1;

-- Créer des notes de test pour cet examen
-- (Remplacez 'exam-id' par l'ID de l'examen sélectionné)
-- INSERT INTO grades (id, student_id, subject_id, exam_id, grade_value, max_grade, coefficient, exam_type, school_id, created_by)
-- VALUES (
--     gen_random_uuid(),
--     'student-id', -- Remplacez par un student_id valide
--     'subject-id', -- Remplacez par un subject_id valide
--     'exam-id', -- ID de l'examen sélectionné
--     15.5,
--     20,
--     1,
--     'examen',
--     'your-school-id',
--     'your-user-id'
-- );

-- Vérifier les notes avant suppression
-- SELECT 'Notes avant suppression:' as info;
-- SELECT COUNT(*) as notes_count 
-- FROM grades 
-- WHERE exam_id = 'exam-id';

-- Supprimer l'examen (cela devrait supprimer les notes associées)
-- DELETE FROM exams WHERE id = 'exam-id';

-- Vérifier les notes après suppression
-- SELECT 'Notes après suppression:' as info;
-- SELECT COUNT(*) as notes_count 
-- FROM grades 
-- WHERE exam_id = 'exam-id';

-- 8. Vérification finale
SELECT 'Vérification finale' as test_step;

-- Vérifier qu'il n'y a pas de notes orphelines
SELECT 'Notes orphelines (exam_id qui n\'existe pas):' as info;
SELECT COUNT(*) as orphaned_notes
FROM grades g
LEFT JOIN exams e ON g.exam_id = e.id
WHERE g.exam_id IS NOT NULL AND e.id IS NULL;

-- Vérifier qu'il n'y a pas d'examens sans notes
SELECT 'Examens sans notes:' as info;
SELECT e.id, e.title, COUNT(g.id) as notes_count
FROM exams e
LEFT JOIN grades g ON e.id = g.exam_id
GROUP BY e.id, e.title
HAVING COUNT(g.id) = 0;

-- 9. Nettoyage des données de test
SELECT 'Nettoyage des données de test' as test_step;

-- Supprimer les examens de test
DELETE FROM exams WHERE title IN ('Première Composition', 'Examen Blanc');

-- Vérifier le nettoyage
SELECT 'Données après nettoyage:' as info;
SELECT COUNT(*) as remaining_test_exams
FROM exams 
WHERE title IN ('Première Composition', 'Examen Blanc');

-- Message de fin
SELECT 'Test terminé avec succès !' as final_message;

