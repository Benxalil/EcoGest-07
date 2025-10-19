-- Script SQL de test pour la correction de ListeClassesResultats
-- Ce script vérifie que les données nécessaires sont disponibles dans la base

-- 1. Vérifier la structure des données de base
SELECT '=== VÉRIFICATION DE LA STRUCTURE DES DONNÉES ===' as test_section;

-- Vérifier les classes
SELECT 'Classes disponibles:' as info, COUNT(*) as count FROM classes;

-- Vérifier les examens
SELECT 'Examens disponibles:' as info, COUNT(*) as count FROM exams;

-- Vérifier les matières
SELECT 'Matières disponibles:' as info, COUNT(*) as count FROM subjects;

-- Vérifier les élèves
SELECT 'Élèves disponibles:' as info, COUNT(*) as count FROM students;

-- Vérifier les notes
SELECT 'Notes disponibles:' as info, COUNT(*) as count FROM grades;

-- 2. Vérifier les jointures et la cohérence
SELECT '=== VÉRIFICATION DES JOINTURES ===' as test_section;

-- Vérifier que tous les examens ont une classe valide
SELECT 
    'Examens avec classes valides:' as info,
    COUNT(*) as count
FROM exams e
JOIN classes c ON e.class_id = c.id;

-- Vérifier que toutes les notes ont des références valides
SELECT 
    'Notes avec références valides:' as info,
    COUNT(*) as count
FROM grades g
JOIN students s ON g.student_id = s.id
JOIN subjects sub ON g.subject_id = sub.id
JOIN classes c ON s.class_id = c.id;

-- 3. Vérifier les données par classe (simulation de useResults)
SELECT '=== DONNÉES PAR CLASSE (SIMULATION useResults) ===' as test_section;

SELECT 
    c.id as class_id,
    c.name as class_name,
    c.level as class_level,
    c.section as class_section,
    c.effectif,
    COUNT(DISTINCT e.id) as nb_examens,
    COUNT(DISTINCT s.id) as nb_eleves,
    COUNT(DISTINCT sub.id) as nb_matieres,
    COUNT(g.id) as nb_notes
FROM classes c
LEFT JOIN students s ON c.id = s.class_id
LEFT JOIN exams e ON c.id = e.class_id
LEFT JOIN subjects sub ON c.id = sub.class_id
LEFT JOIN grades g ON s.id = g.student_id AND sub.id = g.subject_id
GROUP BY c.id, c.name, c.level, c.section, c.effectif
ORDER BY c.level, c.section;

-- 4. Vérifier les examens et leurs détails (simulation de loadExamensForClasse)
SELECT '=== EXAMENS PAR CLASSE (SIMULATION loadExamensForClasse) ===' as test_section;

SELECT 
    c.id as classe_id,
    c.name as classe_nom,
    e.id as exam_id,
    e.title as exam_titre,
    CASE 
        WHEN e.title ILIKE '%composition%' THEN 'Composition'
        ELSE 'Examen'
    END as exam_type,
    e.exam_date,
    COUNT(DISTINCT g.student_id) as nb_eleves_notes,
    COUNT(g.id) as nb_notes_total
FROM classes c
JOIN exams e ON c.id = e.class_id
LEFT JOIN grades g ON e.id = g.exam_id
GROUP BY c.id, c.name, e.id, e.title, e.exam_date
ORDER BY c.name, e.exam_date DESC;

-- 5. Vérifier la détection du type d'examen
SELECT '=== DÉTECTION DU TYPE D\'EXAMEN ===' as test_section;

SELECT 
    e.title as examen_titre,
    CASE 
        WHEN e.title ILIKE '%composition%' THEN 'Composition'
        ELSE 'Examen'
    END as type_detecte,
    CASE 
        WHEN e.title ILIKE '%composition%' THEN 'Options de semestre'
        ELSE 'Consulter les notes'
    END as bouton_action
FROM exams e
ORDER BY e.title;

-- 6. Vérifier les données pour une classe spécifique (exemple)
SELECT '=== EXEMPLE POUR UNE CLASSE SPÉCIFIQUE ===' as test_section;

-- Remplacer 'CLASS_ID_HERE' par l'ID d'une classe réelle
WITH classe_exemple AS (
    SELECT id, name, level, section 
    FROM classes 
    LIMIT 1
)
SELECT 
    ce.name as classe_nom,
    ce.level as classe_niveau,
    ce.section as classe_section,
    e.title as examen_titre,
    e.exam_date,
    CASE 
        WHEN e.title ILIKE '%composition%' THEN 'Composition'
        ELSE 'Examen'
    END as type_examen
FROM classe_exemple ce
LEFT JOIN exams e ON ce.id = e.class_id
ORDER BY e.exam_date DESC;

-- 7. Vérifier la cohérence des données (simulation de la correction)
SELECT '=== VÉRIFICATION DE LA COHÉRENCE ===' as test_section;

-- Vérifier qu'il n'y a pas de données orphelines
SELECT 
    'Notes sans élève:' as verification,
    COUNT(*) as count
FROM grades g
LEFT JOIN students s ON g.student_id = s.id
WHERE s.id IS NULL;

SELECT 
    'Notes sans matière:' as verification,
    COUNT(*) as count
FROM grades g
LEFT JOIN subjects s ON g.subject_id = s.id
WHERE s.id IS NULL;

SELECT 
    'Notes sans examen (pour les examens spécifiques):' as verification,
    COUNT(*) as count
FROM grades g
LEFT JOIN exams e ON g.exam_id = e.id
WHERE g.exam_id IS NOT NULL AND e.id IS NULL;

-- 8. Résumé final pour la correction
SELECT '=== RÉSUMÉ POUR LA CORRECTION ===' as test_section;

SELECT 
    'Total classes' as metric,
    COUNT(*) as value
FROM classes
UNION ALL
SELECT 
    'Total examens',
    COUNT(*)
FROM exams
UNION ALL
SELECT 
    'Total matières',
    COUNT(*)
FROM subjects
UNION ALL
SELECT 
    'Total élèves',
    COUNT(*)
FROM students
UNION ALL
SELECT 
    'Total notes',
    COUNT(*)
FROM grades
UNION ALL
SELECT 
    'Classes avec examens',
    COUNT(DISTINCT c.id)
FROM classes c
JOIN exams e ON c.id = e.class_id
UNION ALL
SELECT 
    'Examens avec notes',
    COUNT(DISTINCT e.id)
FROM exams e
JOIN grades g ON e.id = g.exam_id;

