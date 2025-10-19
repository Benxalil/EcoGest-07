-- Script de test pour la suppression en cascade des notes
-- Ce script teste que la suppression d'un examen supprime bien toutes ses notes

-- 1. Vérifier les examens existants
SELECT 'Examens existants:' as test_step;
SELECT id, title, class_id, created_at 
FROM exams 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Vérifier les notes existantes
SELECT 'Notes existantes:' as test_step;
SELECT 
    g.id,
    g.student_id,
    g.subject_id,
    g.exam_id,
    g.grade_value,
    g.exam_type,
    e.title as exam_title
FROM grades g
LEFT JOIN exams e ON g.exam_id = e.id
ORDER BY g.created_at DESC
LIMIT 10;

-- 3. Compter les notes par examen
SELECT 'Notes par examen:' as test_step;
SELECT 
    e.id as exam_id,
    e.title as exam_title,
    COUNT(g.id) as notes_count
FROM exams e
LEFT JOIN grades g ON e.id = g.exam_id
GROUP BY e.id, e.title
ORDER BY notes_count DESC;

-- 4. Sélectionner un examen avec des notes pour le test
-- (Remplacez 'EXAM_ID_TO_TEST' par un ID d'examen réel)
SELECT 'Examen sélectionné pour le test:' as test_step;
SELECT 
    e.id,
    e.title,
    COUNT(g.id) as notes_count
FROM exams e
LEFT JOIN grades g ON e.id = g.exam_id
WHERE e.id = 'EXAM_ID_TO_TEST'  -- Remplacez par un ID réel
GROUP BY e.id, e.title;

-- 5. Afficher les notes qui seront supprimées
SELECT 'Notes qui seront supprimées:' as test_step;
SELECT 
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.exam_type,
    s.name as subject_name
FROM grades g
LEFT JOIN subjects s ON g.subject_id = s.id
WHERE g.exam_id = 'EXAM_ID_TO_TEST'  -- Remplacez par un ID réel
ORDER BY g.created_at;

-- 6. Test de suppression (DÉCOMMENTEZ POUR EXÉCUTER)
-- ATTENTION: Cette commande supprimera définitivement l'examen et ses notes !
-- DELETE FROM exams WHERE id = 'EXAM_ID_TO_TEST';

-- 7. Vérifier après suppression (DÉCOMMENTEZ APRÈS LA SUPPRESSION)
-- SELECT 'Vérification après suppression:' as test_step;
-- SELECT COUNT(*) as remaining_notes FROM grades WHERE exam_id = 'EXAM_ID_TO_TEST';
-- SELECT COUNT(*) as remaining_exams FROM exams WHERE id = 'EXAM_ID_TO_TEST';

-- Instructions d'utilisation:
-- 1. Remplacez 'EXAM_ID_TO_TEST' par un ID d'examen réel de votre base
-- 2. Exécutez les requêtes 1-5 pour voir l'état avant suppression
-- 3. Décommentez et exécutez la requête 6 pour supprimer l'examen
-- 4. Décommentez et exécutez les requêtes 7 pour vérifier la suppression
