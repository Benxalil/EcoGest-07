-- Script pour nettoyer les notes de test
-- ATTENTION: Ce script supprime toutes les notes pour la classe spécifiée
-- Utilisez-le seulement si vous voulez recommencer les tests

-- 1. Afficher les notes qui seront supprimées (pour vérification)
SELECT 
    'Notes qui seront supprimées' as info,
    COUNT(*) as total_notes,
    COUNT(CASE WHEN exam_type = 'devoir' THEN 1 END) as devoir_notes,
    COUNT(CASE WHEN exam_type = 'composition' THEN 1 END) as composition_notes,
    COUNT(CASE WHEN exam_type = 'examen' OR exam_type IS NULL THEN 1 END) as simple_notes
FROM grades g
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'  -- Remplacez par l'ID de la classe test
);

-- 2. Afficher les détails des notes qui seront supprimées
SELECT 
    g.id,
    s.first_name,
    s.last_name,
    sub.name as subject_name,
    g.exam_type,
    g.semester,
    g.grade_value,
    g.created_at
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id IN (
    SELECT id FROM students 
    WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
)
ORDER BY s.last_name, s.first_name, sub.name, g.exam_type;

-- 3. Supprimer les notes (DÉCOMMENTEZ SEULEMENT SI VOUS VOULEZ SUPPRIMER)
-- DELETE FROM grades 
-- WHERE student_id IN (
--     SELECT id FROM students 
--     WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
-- );

-- 4. Vérifier que les notes ont été supprimées
-- SELECT 
--     'Vérification après suppression' as info,
--     COUNT(*) as remaining_notes
-- FROM grades g
-- WHERE g.student_id IN (
--     SELECT id FROM students 
--     WHERE class_id = 'f5d578f1-bfe9-4b45-9666-8fd7d60b2d30'
-- );
