-- Script pour vérifier les notes après sauvegarde
-- Exécutez ce script dans Supabase pour vérifier que les notes sont bien enregistrées

-- 1. Vérifier toutes les notes pour l'élève spécifique
SELECT 
    'Notes pour l\'élève sélectionné' as info,
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.exam_type,
    g.semester,
    g.created_at,
    s.first_name,
    s.last_name,
    sub.name as subject_name
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id = 'a32ea9dc-b767-4a82-9fca-4fe5475ead31'  -- ID de l'élève de l'URL
ORDER BY sub.name, g.exam_type, g.semester;

-- 2. Vérifier les notes de composition pour cet élève
SELECT 
    'Notes de composition pour l\'élève' as info,
    g.exam_type,
    g.semester,
    g.grade_value,
    sub.name as subject_name
FROM grades g
LEFT JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id = 'a32ea9dc-b767-4a82-9fca-4fe5475ead31'
AND g.exam_type IN ('devoir', 'composition')
ORDER BY sub.name, g.exam_type, g.semester;

-- 3. Compter les notes par type pour cet élève
SELECT 
    'Comptage des notes par type' as info,
    g.exam_type,
    g.semester,
    COUNT(*) as count,
    COUNT(CASE WHEN g.grade_value > 0 THEN 1 END) as notes_with_values
FROM grades g
WHERE g.student_id = 'a32ea9dc-b767-4a82-9fca-4fe5475ead31'
GROUP BY g.exam_type, g.semester
ORDER BY g.exam_type, g.semester;

-- 4. Vérifier les notes récentes (créées dans les dernières minutes)
SELECT 
    'Notes récentes' as info,
    g.id,
    g.student_id,
    g.subject_id,
    g.grade_value,
    g.exam_type,
    g.semester,
    g.created_at,
    s.first_name,
    s.last_name
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
WHERE g.student_id = 'a32ea9dc-b767-4a82-9fca-4fe5475ead31'
AND g.created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY g.created_at DESC;

